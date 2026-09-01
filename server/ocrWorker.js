/**
 * ocrWorker.js
 * ------------
 * Local background worker processing batch cheques asynchronously.
 */

const { get, all, run } = require('./db');
const OcrServiceClient = require('./ocrServiceClient');
const AmountParser = require('./amountParser');

let isProcessing = false;

async function processNextBatch() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const pendingRecord = await get(
      `SELECT * FROM cheque_records WHERE status = 'PENDING' ORDER BY id ASC LIMIT 1`
    );

    if (!pendingRecord) {
      isProcessing = false;
      return;
    }

    const batchId = pendingRecord.batch_id;
    await processQueuedBatch(batchId);
  } catch (err) {
    console.error('[Worker Error]', err.message);
  } finally {
    isProcessing = false;
  }
}

async function processQueuedBatch(batchId) {
  const batchStart = new Date();
  const records = await all(
    `SELECT * FROM cheque_records WHERE batch_id = ? AND status = 'PENDING' ORDER BY id ASC`,
    [batchId]
  );

  for (const record of records) {
    await processOneCheque(record);
  }

  await finishBatch(batchId, batchStart);
}

async function processOneCheque(record, customUrl) {
  const startTime = new Date();
  const startIso = startTime.toISOString();

  await run(
    `UPDATE cheque_records SET status = 'PROCESSING', worker_thread_name = 'local-worker', ocr_start_time = ? WHERE id = ?`,
    [startIso, record.id]
  );

  try {
    const result = await OcrServiceClient.ocrPage(
      record.file_path,
      record.source_file_name,
      record.page_number || 1,
      customUrl
    );

    const endTime = new Date();
    const endIso = endTime.toISOString();
    const durationMs = endTime.getTime() - startTime.getTime();

    const amountInWords = truncate(result.amountInWords, 500);
    const reviewReasons = truncate(joinReasons(result.reviewReasons), 1000);

    await run(
      `UPDATE cheque_records SET
        account_number = ?,
        account_number_confidence_percent = ?,
        account_holder_name = ?,
        account_holder_confidence_percent = ?,
        cheque_date = ?,
        cheque_date_confidence_percent = ?,
        amount_in_words = ?,
        amount_in_words_confidence_percent = ?,
        amount_in_figures = ?,
        amount_in_figures_confidence_percent = ?,
        needs_review = ?,
        review_reasons = ?,
        status = 'PROCESSED',
        ocr_end_time = ?,
        ocr_duration_ms = ?
      WHERE id = ?`,
      [
        result.accountNumber || null,
        result.accountNumberConfidencePercent || null,
        result.accountHolderName || null,
        result.accountHolderConfidencePercent || null,
        result.chequeDate || null,
        result.chequeDateConfidencePercent || null,
        amountInWords,
        result.amountInWordsConfidencePercent || null,
        result.amountInFigures || null,
        result.amountInFiguresConfidencePercent || null,
        result.needsReview ? 1 : 0,
        reviewReasons,
        endIso,
        durationMs,
        record.id,
      ]
    );
  } catch (ex) {
    const endTime = new Date();
    const endIso = endTime.toISOString();
    const durationMs = endTime.getTime() - startTime.getTime();

    await run(
      `UPDATE cheque_records SET
        status = 'OCR_FAILED',
        error_message = ?,
        needs_review = 1,
        ocr_end_time = ?,
        ocr_duration_ms = ?
      WHERE id = ?`,
      [ex.message, endIso, durationMs, record.id]
    );
    console.warn(`[OCR Fail] Cheque ${record.cheque_id}: ${ex.message}`);
  }
}

async function finishBatch(batchId, batchStart) {
  const stillOpenRow = await get(
    `SELECT COUNT(*) as cnt FROM cheque_records WHERE batch_id = ? AND status IN ('PENDING', 'PROCESSING')`,
    [batchId]
  );

  if (stillOpenRow && stillOpenRow.cnt > 0) {
    return;
  }

  const processedRow = await get(
    `SELECT COUNT(*) as cnt FROM cheque_records WHERE batch_id = ? AND status = 'PROCESSED'`,
    [batchId]
  );
  const failedRow = await get(
    `SELECT COUNT(*) as cnt FROM cheque_records WHERE batch_id = ? AND status = 'OCR_FAILED'`,
    [batchId]
  );

  const processed = processedRow ? processedRow.cnt : 0;
  const failed = failedRow ? failedRow.cnt : 0;

  const records = await all(
    `SELECT amount_in_figures FROM cheque_records WHERE batch_id = ?`,
    [batchId]
  );

  let totalAmount = null;
  for (const r of records) {
    const parsed = AmountParser.parseAmount(r.amount_in_figures);
    if (parsed !== null) {
      totalAmount = (totalAmount === null ? 0 : totalAmount) + parsed;
    }
  }

  const batchEnd = new Date();
  const seconds = (batchEnd.getTime() - batchStart.getTime()) / 1000.0;

  await run(
    `UPDATE batches SET
      status = 'COMPLETED',
      completed_at = ?,
      processing_time_seconds = ?,
      processed_count = ?,
      failed_count = ?,
      total_amount_in_figures = ?
    WHERE batch_id = ?`,
    [
      batchEnd.toISOString(),
      Math.round(seconds * 100) / 100,
      processed,
      failed,
      totalAmount,
      batchId,
    ]
  );
}

function joinReasons(reasons) {
  return !reasons || reasons.length === 0 ? null : reasons.join('; ');
}

function truncate(value, max) {
  if (value === null || value === undefined) return null;
  return String(value).length <= max ? value : String(value).substring(0, max);
}

// Start periodic worker timer
function startWorker(intervalMs = 2000) {
  setInterval(processNextBatch, intervalMs);
}

module.exports = {
  startWorker,
  processQueuedBatch,
  processOneCheque,
  finishBatch,
};
