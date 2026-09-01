/**
 * index.js
 * --------
 * Main Express server for CTS Cheque OCR (Local Standalone Server).
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { startWorker } = require('./ocrWorker');
const { run, get, all } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount CTS Cheque API router under /api/cheques
app.use('/api/cheques', routes);

// Root endpoint returning API status info (Pure Backend API Mode)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'CTS Cheque OCR API Server',
    version: '1.0.0',
    apiBaseUrl: `http://localhost:${PORT}/api/cheques`
  });
});

async function syncDiskStorage() {
  try {
    const storageDir = path.join(__dirname, '..', '..', 'storage');
    if (!fs.existsSync(storageDir)) return;

    const files = fs.readdirSync(storageDir);
    const batchId = 'BATCH-001';
    const batchDir = path.join(storageDir, batchId);
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true });
    }

    const batchRow = await get(`SELECT * FROM batches WHERE batch_id = ?`, [batchId]);
    if (!batchRow) {
      await run(
        `INSERT INTO batches (batch_id, source_file_name, storage_path, total_files, total_cheques, worker_threads, status, submitted_at)
         VALUES (?, 'Default Storage Batch', ?, 0, 0, 4, 'PROCESSING', ?)`,
        [batchId, batchDir, new Date().toISOString()]
      );
    }

    // Move any loose PDFs/images sitting in root storage/ into storage/BATCH-001/
    for (const f of files) {
      if (f.endsWith('.pdf') || f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) {
        const src = path.join(storageDir, f);
        const dest = path.join(batchDir, f);
        if (!fs.existsSync(dest)) {
          fs.renameSync(src, dest);
        }
      }
    }

    // Register any unregistered files in subdirectories of storage/
    const subDirs = fs.readdirSync(storageDir);
    for (const dirName of subDirs) {
      const subPath = path.join(storageDir, dirName);
      if (fs.statSync(subPath).isDirectory() && dirName.startsWith('BATCH-')) {
        const currentBatchId = dirName;
        const childFiles = fs.readdirSync(subPath);

        for (const f of childFiles) {
          const ext = path.extname(f).toLowerCase();
          if (['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'].includes(ext)) {
            const filePath = path.resolve(subPath, f);
            const chequeId = path.basename(f, ext);
            const existing = await get(`SELECT * FROM cheque_records WHERE batch_id = ? AND cheque_id = ?`, [currentBatchId, chequeId]);
            if (!existing) {
              await run(
                `INSERT INTO cheque_records (batch_id, cheque_id, source_file_name, file_path, page_number, status)
                 VALUES (?, ?, ?, ?, 1, 'PENDING')`,
                [currentBatchId, chequeId, f, filePath]
              );
              console.log(`[Storage Sync] Registered ${f} in ${currentBatchId}`);
            }
          }
        }

        const totalRow = await get(`SELECT COUNT(*) as cnt FROM cheque_records WHERE batch_id = ?`, [currentBatchId]);
        if (totalRow) {
          await run(`UPDATE batches SET total_cheques = ?, total_files = ? WHERE batch_id = ?`, [totalRow.cnt, totalRow.cnt, currentBatchId]);
        }
      }
    }
  } catch (err) {
    console.warn('[Storage Sync Warning]', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`==================================================`);
  console.log(`  CTS Cheque OCR Backend listening on port ${PORT}`);
  console.log(`  API Base URL: http://localhost:${PORT}/api/cheques`);
  console.log(`==================================================`);
  // Auto-sync any PDFs placed on disk into database
  await syncDiskStorage();
  // Start local background worker for OCR batch processing
  startWorker(1500);
});
