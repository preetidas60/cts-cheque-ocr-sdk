/**
 * chequeEventHandlers.js
 * -----------------------
 * Registered against the "x_2210302_cts_ch_0.process_batch" event.
 */

var OcrServiceClient = require("./ocrServiceClient.js");
var AmountParser = require("./amountParser.js");

function onProcessBatch(event) {
  var batchId = event.parm1;
  processQueuedBatch(batchId);
}

function processQueuedBatch(batchId) {
  var batchStart = new GlideDateTime();

  var recGr = new GlideRecord("x_2210302_cts_ch_0_record");
  recGr.addQuery("batch_id", batchId);
  recGr.addQuery("status", "PENDING");
  recGr.orderBy("sys_id");
  recGr.query();

  while (recGr.next()) {
    processOneCheque(recGr);
  }

  finishBatch(batchId, batchStart);
}

function processOneCheque(recGr) {
  var start = new GlideDateTime();
  recGr.setValue("status", "PROCESSING");
  recGr.setValue("worker_thread_name", "bg-event");
  recGr.setValue("ocr_start_time", start);
  recGr.update();

  try {
    var result = OcrServiceClient.ocrPage(
      recGr.getValue("attachment_sys_id"),
      recGr.getValue("source_file_name"),
      recGr.getValue("page_number") || 1
    );

    recGr.setValue("account_number", result.accountNumber);
    recGr.setValue("account_number_confidence_percent", result.accountNumberConfidencePercent);
    recGr.setValue("account_holder_name", result.accountHolderName);
    recGr.setValue("account_holder_confidence_percent", result.accountHolderConfidencePercent);
    recGr.setValue("cheque_date", result.chequeDate);
    recGr.setValue("cheque_date_confidence_percent", result.chequeDateConfidencePercent);
    recGr.setValue("amount_in_words", truncate(result.amountInWords, 500));
    recGr.setValue("amount_in_words_confidence_percent", result.amountInWordsConfidencePercent);
    recGr.setValue("amount_in_figures", result.amountInFigures);
    recGr.setValue("amount_in_figures_confidence_percent", result.amountInFiguresConfidencePercent);
    recGr.setValue("needs_review", !!result.needsReview);
    recGr.setValue("review_reasons", truncate(joinReasons(result.reviewReasons), 1000));
    recGr.setValue("status", "PROCESSED");

    var end = new GlideDateTime();
    recGr.setValue("ocr_end_time", end);
    recGr.setValue("ocr_duration_ms", GlideDateTime.subtract(start, end).getNumericValue());
  } catch (ex) {
    var endTime = new GlideDateTime();
    recGr.setValue("status", "OCR_FAILED");
    recGr.setValue("error_message", ex.message);
    recGr.setValue("needs_review", true);
    recGr.setValue("ocr_end_time", endTime);
    recGr.setValue("ocr_duration_ms", GlideDateTime.subtract(start, endTime).getNumericValue());
    gs.warn("[x_2210302_cts_ch_0] OCR failed for " + recGr.getValue("cheque_id") + ": " + ex.message);
  }

  recGr.update();
}

function finishBatch(batchId, batchStart) {
  var stillOpen = new GlideAggregate("x_2210302_cts_ch_0_record");
  stillOpen.addQuery("batch_id", batchId);
  stillOpen.addQuery("status", "IN", "PENDING,PROCESSING");
  stillOpen.addAggregate("COUNT");
  stillOpen.query();
  if (stillOpen.next() && parseInt(stillOpen.getAggregate("COUNT"), 10) > 0) {
    return;
  }

  var processed = countByStatus(batchId, "PROCESSED");
  var failed = countByStatus(batchId, "OCR_FAILED");

  var batchGr = new GlideRecord("x_2210302_cts_ch_0_batch");
  if (!batchGr.get("batch_id", batchId)) return;

  var end = new GlideDateTime();
  var seconds = GlideDateTime.subtract(batchStart, end).getNumericValue() / 1000.0;

  batchGr.setValue("status", "COMPLETED");
  batchGr.setValue("completed_at", end);
  batchGr.setValue("processing_time_seconds", round(seconds));
  batchGr.setValue("processed_count", processed);
  batchGr.setValue("failed_count", failed);
  batchGr.update();
}

function countByStatus(batchId, status) {
  var ga = new GlideAggregate("x_2210302_cts_ch_0_record");
  ga.addQuery("batch_id", batchId);
  ga.addQuery("status", status);
  ga.addAggregate("COUNT");
  ga.query();
  return ga.next() ? parseInt(ga.getAggregate("COUNT"), 10) || 0 : 0;
}

function joinReasons(reasons) {
  return !reasons || reasons.length === 0 ? null : reasons.join("; ");
}

function truncate(value, max) {
  if (value === null || value === undefined) return null;
  return String(value).length <= max ? value : String(value).substring(0, max);
}

function round(v) {
  return Math.round(v * 100) / 100;
}

module.exports = {
  onProcessBatch: onProcessBatch,
  processQueuedBatch: processQueuedBatch,
};
