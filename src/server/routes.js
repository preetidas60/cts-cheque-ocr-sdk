/**
 * routes.js
 * ---------
 * Express routes matching the CTS Cheque REST API specification.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { run, get, all } = require('./db');
const AmountParser = require('./amountParser');
const OcrServiceClient = require('./ocrServiceClient');
const { processOneCheque, finishBatch } = require('./ocrWorker');

const storageDir = path.join(__dirname, '..', '..', 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const upload = multer({ dest: path.join(__dirname, '..', '..', 'tmp_uploads') });

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'];
const MAX_CHEQUES = 250;

function extensionOf(fileName) {
  const dot = fileName.lastIndexOf('.');
  return dot <= 0 ? '' : fileName.substring(dot).toLowerCase();
}

function baseName(fileName) {
  let name = fileName.replace(/^.*[\\/]/, '');
  const ext = extensionOf(name);
  if (ext && name.length > ext.length) name = name.substring(0, name.length - ext.length);
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '');
  return cleaned || 'cheque';
}

function uniqueId(base, used) {
  let candidate = base;
  let suffix = 2;
  while (used[candidate]) candidate = base + '_' + suffix++;
  used[candidate] = true;
  return candidate;
}

// GET /config
router.get('/config', (req, res) => {
  res.json({
    defaultWorkerThreads: 4,
    maxWorkerThreads: 8,
    maxCheques: MAX_CHEQUES,
    acceptedExtensions: ACCEPTED_EXTENSIONS.slice().sort(),
    ocrServiceUrl: OcrServiceClient.getOcrServiceUrl(),
  });
});

// POST /config (Update active OCR Service URL)
router.post('/config', (req, res) => {
  const { ocrServiceUrl } = req.body || {};
  if (ocrServiceUrl && typeof ocrServiceUrl === 'string') {
    const updatedUrl = OcrServiceClient.setOcrServiceUrl(ocrServiceUrl);
    return res.json({ status: 'ok', ocrServiceUrl: updatedUrl });
  }
  res.status(400).json({ error: 'ocrServiceUrl is required' });
});

// GET /batches
router.get('/batches', async (req, res) => {
  try {
    const batches = await all(`SELECT * FROM batches ORDER BY id DESC`);
    const result = [];
    for (const b of batches) {
      const totalAmount = await totalAmountForBatch(b.batch_id);
      result.push(batchSummaryDto(b, totalAmount));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batch_id
router.get('/batches/:batch_id', async (req, res) => {
  try {
    const batchId = req.params.batch_id;
    const batch = await get(`SELECT * FROM batches WHERE batch_id = ?`, [batchId]);
    if (!batch) {
      return res.status(404).json({ error: `No such batch: ${batchId}` });
    }

    const records = await all(
      `SELECT * FROM cheque_records WHERE batch_id = ? ORDER BY id ASC`,
      [batchId]
    );

    let total = null;
    const cheques = [];
    for (const r of records) {
      const parsed = AmountParser.parseAmount(r.amount_in_figures);
      if (parsed !== null) total = (total === null ? 0 : total) + parsed;
      cheques.push(chequeDetailDto(r));
    }

    res.json({
      batch: batchSummaryDto(batch, total),
      cheques: cheques,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batch_id/cheques/:cheque_id
router.get('/batches/:batch_id/cheques/:cheque_id', async (req, res) => {
  try {
    const { batch_id, cheque_id } = req.params;
    const rec = await get(
      `SELECT * FROM cheque_records WHERE batch_id = ? AND cheque_id = ?`,
      [batch_id, cheque_id]
    );
    if (!rec) {
      return res.status(404).json({ error: `No such cheque: ${cheque_id} in batch ${batch_id}` });
    }
    res.json(chequeDetailDto(rec));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batch_id/cheques/:cheque_id/image
router.get('/batches/:batch_id/cheques/:cheque_id/image', async (req, res) => {
  try {
    const { batch_id, cheque_id } = req.params;
    const rec = await get(
      `SELECT * FROM cheque_records WHERE batch_id = ? AND cheque_id = ?`,
      [batch_id, cheque_id]
    );
    if (!rec) {
      return res.status(404).json({ error: `No such cheque: ${cheque_id}` });
    }

    const scaleReq = req.query.scale ? parseFloat(req.query.scale) : 2.5;
    const scale = Math.max(0.5, Math.min(scaleReq, 6.0));

    if (!fs.existsSync(rec.file_path)) {
      return res.status(404).json({ error: 'Source file missing on disk' });
    }

    try {
      const pngBuffer = await OcrServiceClient.renderPage(
        rec.file_path,
        rec.source_file_name,
        rec.page_number || 1,
        scale
      );
      res.setHeader('Content-Type', 'image/png');
      res.send(pngBuffer);
    } catch (ex) {
      // Fallback: send source file directly if render fails
      res.sendFile(path.resolve(rec.file_path));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batch_id/cheques/:cheque_id/file
router.get('/batches/:batch_id/cheques/:cheque_id/file', async (req, res) => {
  try {
    const { batch_id, cheque_id } = req.params;
    const rec = await get(
      `SELECT * FROM cheque_records WHERE batch_id = ? AND cheque_id = ?`,
      [batch_id, cheque_id]
    );
    if (!rec || !fs.existsSync(rec.file_path)) {
      return res.status(404).json({ error: `File not found` });
    }

    res.download(path.resolve(rec.file_path), rec.source_file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /batches/:batch_id/cheques/:cheque_id
router.patch('/batches/:batch_id/cheques/:cheque_id', async (req, res) => {
  try {
    const { batch_id, cheque_id } = req.params;
    const rec = await get(
      `SELECT * FROM cheque_records WHERE batch_id = ? AND cheque_id = ?`,
      [batch_id, cheque_id]
    );
    if (!rec) {
      return res.status(404).json({ error: `No such cheque: ${cheque_id}` });
    }

    const { verifiedAccountNumber } = req.body || {};
    if (!verifiedAccountNumber || !verifiedAccountNumber.trim()) {
      return res.status(400).json({ error: 'verifiedAccountNumber is required' });
    }

    const verifiedBy = 'Operator (Local)';
    const verifiedAt = new Date().toISOString();

    await run(
      `UPDATE cheque_records SET
        verified_account_number = ?,
        verified_by = ?,
        verified_at = ?,
        needs_review = 0
      WHERE id = ?`,
      [verifiedAccountNumber.trim(), verifiedBy, verifiedAt, rec.id]
    );

    const updated = await get(`SELECT * FROM cheque_records WHERE id = ?`, [rec.id]);
    res.json(chequeDetailDto(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /process
router.post('/process', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No cheques given — attach files as the 'files' form field" });
    }
    if (files.length > MAX_CHEQUES) {
      return res.status(400).json({ error: `${files.length} files given — max ${MAX_CHEQUES} per request` });
    }

    const requestedThreads = req.query.workerThreads ? parseInt(req.query.workerThreads, 10) : 4;
    const workerThreads = Math.max(1, Math.min(requestedThreads, 8));

    const countRow = await get(`SELECT COUNT(*) as cnt FROM batches`);
    const nextSeq = (countRow ? countRow.cnt : 0) + 1;
    const batchId = 'BATCH-' + ('000' + nextSeq).slice(-3);

    const batchDir = path.join(storageDir, batchId);
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true });
    }

    const summaryFileName = files.length === 1 ? files[0].originalname : `${files[0].originalname} (+${files.length - 1} more)`;
    const submittedAt = new Date().toISOString();

    await run(
      `INSERT INTO batches (batch_id, source_file_name, storage_path, total_files, total_cheques, worker_threads, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PROCESSING', ?)`,
      [batchId, summaryFileName, batchDir, files.length, files.length, workerThreads, submittedAt]
    );

    const used = {};
    let totalCheques = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = file.originalname || 'unnamed.pdf';
      const ext = extensionOf(originalName);
      const chequeId = uniqueId(baseName(originalName), used);

      const targetPath = path.join(batchDir, `${chequeId}${ext}`);
      fs.renameSync(file.path, targetPath);

      if (ACCEPTED_EXTENSIONS.indexOf(ext) === -1) {
        await run(
          `INSERT INTO cheque_records (batch_id, cheque_id, source_file_name, file_path, page_number, status, error_message, needs_review)
           VALUES (?, ?, ?, ?, 1, 'OCR_FAILED', ?, 1)`,
          [batchId, chequeId, originalName, targetPath, `unsupported file type '${ext}'`]
        );
      } else {
        await run(
          `INSERT INTO cheque_records (batch_id, cheque_id, source_file_name, file_path, page_number, status)
           VALUES (?, ?, ?, ?, 1, 'PENDING')`,
          [batchId, chequeId, originalName, targetPath]
        );
      }
      totalCheques++;
    }

    await run(`UPDATE batches SET total_cheques = ? WHERE batch_id = ?`, [totalCheques, batchId]);

    res.json({
      status: 'PROCESSING',
      batchId: batchId,
      totalFiles: files.length,
      totalCheques: totalCheques,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /process/stream (NDJSON live streaming batch processing)
router.post('/process/stream', upload.array('files'), async (req, res) => {
  try {
    const uploadedFiles = req.files || [];
    const folderPathInput = req.body && req.body.folderPath ? req.body.folderPath.trim() : '';

    let filesToProcess = [];

    // 1. Process uploaded files
    for (const f of uploadedFiles) {
      filesToProcess.push({
        type: 'uploaded',
        originalName: f.originalname || 'unnamed.pdf',
        tempPath: f.path,
      });
    }

    // 2. Process folder path if provided
    if (folderPathInput) {
      const resolvedFolder = path.resolve(folderPathInput);
      if (fs.existsSync(resolvedFolder) && fs.statSync(resolvedFolder).isDirectory()) {
        const folderItems = fs.readdirSync(resolvedFolder);
        for (const item of folderItems) {
          const itemPath = path.join(resolvedFolder, item);
          if (fs.statSync(itemPath).isFile()) {
            const ext = extensionOf(item);
            if (ACCEPTED_EXTENSIONS.includes(ext)) {
              filesToProcess.push({
                type: 'server_file',
                originalName: item,
                sourcePath: itemPath,
              });
            }
          }
        }
      } else {
        return res.status(400).json({ error: `Folder path '${folderPathInput}' does not exist or is not a directory` });
      }
    }

    if (filesToProcess.length === 0) {
      return res.status(400).json({ error: "No cheques provided — attach files or specify a valid server folderPath" });
    }

    if (filesToProcess.length > MAX_CHEQUES) {
      return res.status(400).json({ error: `${filesToProcess.length} files given — max ${MAX_CHEQUES} per request` });
    }

    const requestedThreads = req.body && req.body.workerThreads ? parseInt(req.body.workerThreads, 10) : 4;
    const workerThreads = Math.max(1, Math.min(requestedThreads, 8));

    const countRow = await get(`SELECT COUNT(*) as cnt FROM batches`);
    const nextSeq = (countRow ? countRow.cnt : 0) + 1;
    const batchId = 'BATCH-' + ('000' + nextSeq).slice(-3);

    const batchDir = path.join(storageDir, batchId);
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true });
    }

    const summaryFileName = filesToProcess.length === 1
      ? filesToProcess[0].originalName
      : `${filesToProcess[0].originalName} (+${filesToProcess.length - 1} more)`;
    const submittedAt = new Date().toISOString();

    await run(
      `INSERT INTO batches (batch_id, source_file_name, storage_path, total_files, total_cheques, worker_threads, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PROCESSING', ?)`,
      [batchId, summaryFileName, batchDir, filesToProcess.length, filesToProcess.length, workerThreads, submittedAt]
    );

    const used = {};
    const createdRecords = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const item = filesToProcess[i];
      const ext = extensionOf(item.originalName);
      const chequeId = uniqueId(baseName(item.originalName), used);
      const targetPath = path.join(batchDir, `${chequeId}${ext}`);

      if (item.type === 'uploaded') {
        fs.renameSync(item.tempPath, targetPath);
      } else if (item.type === 'server_file') {
        fs.copyFileSync(item.sourcePath, targetPath);
      }

      const absPath = path.resolve(targetPath);

      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        await run(
          `INSERT INTO cheque_records (batch_id, cheque_id, source_file_name, file_path, page_number, status, error_message, needs_review)
           VALUES (?, ?, ?, ?, 1, 'OCR_FAILED', ?, 1)`,
          [batchId, chequeId, item.originalName, absPath, `unsupported file type '${ext}'`]
        );
      } else {
        await run(
          `INSERT INTO cheque_records (batch_id, cheque_id, source_file_name, file_path, page_number, status)
           VALUES (?, ?, ?, ?, 1, 'PENDING')`,
          [batchId, chequeId, item.originalName, absPath]
        );
      }

      const rec = await get(`SELECT * FROM cheque_records WHERE batch_id = ? AND cheque_id = ?`, [batchId, chequeId]);
      createdRecords.push(rec);
    }

    // Set NDJSON headers
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 1. Send initial batch event
    res.write(JSON.stringify({
      type: 'batch',
      batchId: batchId,
      totalFiles: filesToProcess.length,
      totalCheques: filesToProcess.length,
      workerThreads: workerThreads,
    }) + '\n');

    const customOcrUrl = req.body && req.body.ocrServiceUrl ? req.body.ocrServiceUrl.trim() : '';
    if (customOcrUrl) {
      OcrServiceClient.setOcrServiceUrl(customOcrUrl);
    }

    // Pre-warm Python FastAPI OCR engine pool to workerThreads size
    await OcrServiceClient.ensureEnginePool(workerThreads, customOcrUrl);

    const batchStart = new Date();
    let doneCount = 0;

    // Process queued cheques concurrently up to workerThreads
    const chunkArray = (arr, size) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const chunks = chunkArray(createdRecords, workerThreads);
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (record) => {
          if (record.status === 'PENDING') {
            await processOneCheque(record, customOcrUrl);
          }
          const updatedRec = await get(`SELECT * FROM cheque_records WHERE id = ?`, [record.id]);
          doneCount++;

          res.write(JSON.stringify({
            type: 'cheque',
            done: doneCount,
            total: filesToProcess.length,
            result: chequeDetailDto(updatedRec),
          }) + '\n');
        })
      );
    }

    // Finish batch and calculate stats
    await finishBatch(batchId, batchStart);
    const finalBatch = await get(`SELECT * FROM batches WHERE batch_id = ?`, [batchId]);

    const durationSeconds = finalBatch ? (finalBatch.processing_time_seconds || 0.1) : 0.1;
    const throughput = Math.round((filesToProcess.length / durationSeconds) * 10) / 10;

    res.write(JSON.stringify({
      type: 'done',
      batchId: batchId,
      status: finalBatch ? finalBatch.status : 'COMPLETED',
      processedCount: finalBatch ? finalBatch.processed_count : doneCount,
      failedCount: finalBatch ? finalBatch.failed_count : 0,
      processingTimeSeconds: durationSeconds,
      throughputChequesPerSec: throughput,
    }) + '\n');

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(JSON.stringify({ type: 'error', error: err.message }) + '\n');
      res.end();
    }
  }
});

async function totalAmountForBatch(batchId) {
  const records = await all(`SELECT amount_in_figures FROM cheque_records WHERE batch_id = ?`, [batchId]);
  let total = null;
  for (const r of records) {
    const parsed = AmountParser.parseAmount(r.amount_in_figures);
    if (parsed !== null) total = (total === null ? 0 : total) + parsed;
  }
  return total;
}

function batchSummaryDto(b, totalAmount) {
  return {
    batchId: b.batch_id,
    sourceFileName: b.source_file_name,
    totalFiles: b.total_files,
    totalCheques: b.total_cheques,
    processedCount: b.processed_count,
    failedCount: b.failed_count,
    workerThreads: b.worker_threads,
    status: b.status,
    submittedAt: b.submitted_at,
    completedAt: b.completed_at || null,
    processingTimeSeconds: b.processing_time_seconds,
    totalAmountInFigures: totalAmount,
  };
}

function chequeDetailDto(r) {
  const base = `/api/cheques/batches/${encodeURIComponent(r.batch_id)}/cheques/${encodeURIComponent(r.cheque_id)}`;

  return {
    batchId: r.batch_id,
    chequeId: r.cheque_id,
    fileName: r.source_file_name,
    pageNumber: r.page_number || 1,
    status: r.status,

    accountNumber: fieldResult(r.account_number, r.account_number_confidence_percent),
    accountHolderName: fieldResult(r.account_holder_name, r.account_holder_confidence_percent),
    chequeDate: fieldResult(r.cheque_date, r.cheque_date_confidence_percent),
    amountInWords: fieldResult(r.amount_in_words, r.amount_in_words_confidence_percent),
    amountInFigures: fieldResult(r.amount_in_figures, r.amount_in_figures_confidence_percent),

    needsReview: r.needs_review === 1,
    reviewReasons: splitReasons(r.review_reasons),

    verifiedAccountNumber: r.verified_account_number || null,
    verifiedBy: r.verified_by || null,
    verifiedAt: r.verified_at || null,

    workerThreadName: r.worker_thread_name || null,
    ocrDurationMs: r.ocr_duration_ms || null,
    errorMessage: r.error_message || null,

    imageUrl: base + '/image',
    fileUrl: base + '/file',
  };
}

function fieldResult(value, confidence) {
  const v = value || null;
  return {
    value: v,
    confidencePercent: v === null ? null : round(confidence),
  };
}

function splitReasons(joined) {
  if (!joined) return [];
  return joined
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function round(v) {
  return v === null || v === undefined ? null : Math.round(v * 100) / 100;
}

module.exports = router;
