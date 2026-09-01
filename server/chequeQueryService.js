/**
 * chequeQueryService.js
 * -----------------------
 * Port of service/ChequeQueryService.java.
 */

var OcrServiceClient = require("./ocrServiceClient.js");
var AmountParser = require("./amountParser.js");

function listBatches(request, response) {
  var gr = new GlideRecord("x_2210302_cts_ch_0_batch");
  gr.orderByDesc("sys_id");
  gr.query();

  var out = [];
  while (gr.next()) {
    out.push(batchSummaryDto(gr, totalAmountForBatch(gr.getValue("batch_id"))));
  }
  response.setBody(out);
}

function batchDetail(request, response) {
  var batchId = request.pathParams.batch_id;
  var batchGr = new GlideRecord("x_2210302_cts_ch_0_batch");
  if (!batchGr.get("batch_id", batchId)) {
    return notFound(response, "No such batch: " + batchId);
  }

  var recGr = new GlideRecord("x_2210302_cts_ch_0_record");
  recGr.addQuery("batch_id", batchId);
  recGr.orderBy("sys_id");
  recGr.query();

  var total = null;
  var cheques = [];
  while (recGr.next()) {
    var parsed = AmountParser.parseAmount(recGr.getValue("amount_in_figures"));
    if (parsed !== null) total = (total === null ? 0 : total) + parsed;
    cheques.push(chequeDetailDto(recGr));
  }

  response.setBody({
    batch: batchSummaryDto(batchGr, total),
    cheques: cheques,
  });
}

function cheque(request, response) {
  var recGr = require_(request, response);
  if (!recGr) return;
  response.setBody(chequeDetailDto(recGr));
}

function verify(request, response) {
  var recGr = require_(request, response);
  if (!recGr) return;

  var body = request.body.data || {};
  var verifiedAccountNumber = (body.verifiedAccountNumber || "").trim();
  if (!verifiedAccountNumber) {
    return badRequest(response, "verifiedAccountNumber is required");
  }

  recGr.setValue("verified_account_number", verifiedAccountNumber);
  recGr.setValue("verified_by", gs.getUserID());
  recGr.setValue("verified_at", new GlideDateTime());
  recGr.setValue("needs_review", false);
  recGr.update();

  gs.info(
    "[x_2210302_cts_ch_0] CHEQUE VERIFIED batchId=" + recGr.getValue("batch_id") +
      " chequeId=" + recGr.getValue("cheque_id") +
      " ocrRead=" + recGr.getValue("account_number") +
      " operatorConfirmed=" + verifiedAccountNumber +
      " by=" + gs.getUserName()
  );

  response.setBody(chequeDetailDto(recGr));
}

function renderImage(request, response) {
  var recGr = require_(request, response);
  if (!recGr) return;

  var requested = request.queryParams.scale ? parseFloat(request.queryParams.scale[0]) : 2.5;
  var scale = Math.max(0.5, Math.min(requested, 6.0));

  var png = OcrServiceClient.renderPage(
    recGr.getValue("attachment_sys_id"),
    recGr.getValue("source_file_name"),
    recGr.getValue("page_number") || 1,
    scale
  );
  response.setContentType("image/png");
  response.setBody(png);
}

function originalFile(request, response) {
  var recGr = require_(request, response);
  if (!recGr) return;

  var sa = new GlideSysAttachment();
  var stream = sa.getContentStream(recGr.getValue("attachment_sys_id"));
  var attGr = new GlideRecord("sys_attachment");
  attGr.get(recGr.getValue("attachment_sys_id"));

  response.setContentType(attGr.getValue("content_type") || "application/octet-stream");
  response.setHeader(
    "Content-Disposition",
    'inline; filename="' + (recGr.getValue("source_file_name") || "cheque") + '"'
  );
  response.setBody(stream);
}

function require_(request, response) {
  var batchId = request.pathParams.batch_id;
  var chequeId = request.pathParams.cheque_id;
  var gr = new GlideRecord("x_2210302_cts_ch_0_record");
  gr.addQuery("batch_id", batchId);
  gr.addQuery("cheque_id", chequeId);
  gr.query();
  if (!gr.next()) {
    notFound(response, "No such cheque: " + chequeId + " in batch " + batchId);
    return null;
  }
  return gr;
}

function totalAmountForBatch(batchId) {
  var gr = new GlideRecord("x_2210302_cts_ch_0_record");
  gr.addQuery("batch_id", batchId);
  gr.query();
  var total = null;
  while (gr.next()) {
    var parsed = AmountParser.parseAmount(gr.getValue("amount_in_figures"));
    if (parsed !== null) total = (total === null ? 0 : total) + parsed;
  }
  return total;
}

function batchSummaryDto(gr, totalAmount) {
  return {
    batchId: gr.getValue("batch_id"),
    sourceFileName: gr.getValue("source_file_name"),
    totalFiles: toIntOrNull(gr.getValue("total_files")),
    totalCheques: toIntOrNull(gr.getValue("total_cheques")) || 0,
    processedCount: toIntOrNull(gr.getValue("processed_count")),
    failedCount: toIntOrNull(gr.getValue("failed_count")),
    workerThreads: toIntOrNull(gr.getValue("worker_threads")),
    status: gr.getValue("status"),
    submittedAt: gr.getValue("submitted_at"),
    completedAt: gr.getValue("completed_at") || null,
    processingTimeSeconds: toFloatOrNull(gr.getValue("processing_time_seconds")),
    totalAmountInFigures: totalAmount,
  };
}

function chequeDetailDto(gr) {
  var batchId = gr.getValue("batch_id");
  var chequeId = gr.getValue("cheque_id");
  var base =
    "/api/x_2210302_cts_ch_0/cheques/batches/" + encodeURIComponent(batchId) +
    "/cheques/" + encodeURIComponent(chequeId);

  return {
    batchId: batchId,
    chequeId: chequeId,
    fileName: gr.getValue("source_file_name"),
    pageNumber: toIntOrNull(gr.getValue("page_number")) || 1,
    status: gr.getValue("status"),

    accountNumber: fieldResult(gr.getValue("account_number"), gr.getValue("account_number_confidence_percent")),
    accountHolderName: fieldResult(gr.getValue("account_holder_name"), gr.getValue("account_holder_confidence_percent")),
    chequeDate: fieldResult(gr.getValue("cheque_date"), gr.getValue("cheque_date_confidence_percent")),
    amountInWords: fieldResult(gr.getValue("amount_in_words"), gr.getValue("amount_in_words_confidence_percent")),
    amountInFigures: fieldResult(gr.getValue("amount_in_figures"), gr.getValue("amount_in_figures_confidence_percent")),

    needsReview: gr.getValue("needs_review") === "" ? null : gr.getValue("needs_review") === "true",
    reviewReasons: splitReasons(gr.getValue("review_reasons")),

    verifiedAccountNumber: gr.getValue("verified_account_number") || null,
    verifiedBy: gr.getDisplayValue("verified_by") || null,
    verifiedAt: gr.getValue("verified_at") || null,

    workerThreadName: gr.getValue("worker_thread_name") || null,
    ocrDurationMs: toIntOrNull(gr.getValue("ocr_duration_ms")),
    errorMessage: gr.getValue("error_message") || null,

    imageUrl: base + "/image",
    fileUrl: base + "/file",
  };
}

function fieldResult(value, confidence) {
  var v = value || null;
  return {
    value: v,
    confidencePercent: v === null ? null : round(toFloatOrNull(confidence)),
  };
}

function splitReasons(joined) {
  if (!joined) return [];
  return joined
    .split(";")
    .map(function (s) {
      return s.trim();
    })
    .filter(function (s) {
      return s.length > 0;
    });
}

function toIntOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  var n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}
function toFloatOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function round(v) {
  return v === null ? null : Math.round(v * 100) / 100;
}

function notFound(response, message) {
  response.setStatus(404);
  response.setBody({ error: message });
}
function badRequest(response, message) {
  response.setStatus(400);
  response.setBody({ error: message });
}

module.exports = {
  listBatches: listBatches,
  batchDetail: batchDetail,
  cheque: cheque,
  verify: verify,
  renderImage: renderImage,
  originalFile: originalFile,
};
