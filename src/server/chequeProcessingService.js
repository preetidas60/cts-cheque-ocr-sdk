/**
 * chequeProcessingService.js
 * ---------------------------
 * Port of service/ChequeProcessingService.java.
 */

var ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"];

function maxCheques() {
  var v = parseInt(gs.getProperty("x_2210302_cts_ch_0.ocr.batch.max_cheques", "250"), 10);
  return isNaN(v) ? 250 : v;
}

function unlimited() {
  return maxCheques() <= 0;
}

function extensionOf(fileName) {
  var dot = fileName.lastIndexOf(".");
  return dot <= 0 ? "" : fileName.substring(dot).toLowerCase();
}

function baseName(fileName) {
  var name = fileName.replace(/^.*[\\/]/, "");
  var ext = extensionOf(name);
  if (ext && name.length > ext.length) name = name.substring(0, name.length - ext.length);
  var cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "");
  return cleaned || "cheque";
}

function uniqueId(base, used) {
  var candidate = base;
  var suffix = 2;
  while (used[candidate]) candidate = base + "_" + suffix++;
  used[candidate] = true;
  return candidate;
}

function getConfig(request, response) {
  var body = {
    defaultWorkerThreads: parseInt(gs.getProperty("x_2210302_cts_ch_0.ocr.worker.pool_size", "4"), 10),
    maxWorkerThreads: parseInt(gs.getProperty("x_2210302_cts_ch_0.ocr.worker.max_pool_size", "8"), 10),
    maxCheques: maxCheques(),
    acceptedExtensions: ACCEPTED_EXTENSIONS.slice().sort(),
  };
  response.setBody(body);
}

function processBatch(request, response) {
  var files = request.body.dataMultipart ? request.body.dataMultipart.files : [];
  if (!files || files.length === 0) {
    return badRequest(
      response,
      "No cheques given — attach files as the 'files' form field"
    );
  }
  if (!unlimited() && files.length > maxCheques()) {
    return badRequest(
      response,
      files.length + " files given — max " + maxCheques() + " per request"
    );
  }

  var requestedThreads = request.queryParams.workerThreads
    ? parseInt(request.queryParams.workerThreads[0], 10)
    : parseInt(gs.getProperty("x_2210302_cts_ch_0.ocr.worker.pool_size", "4"), 10);
  var ceiling = parseInt(gs.getProperty("x_2210302_cts_ch_0.ocr.worker.max_pool_size", "8"), 10);
  var poolSize = Math.max(1, Math.min(requestedThreads, ceiling));

  var batchGr = new GlideRecord("x_2210302_cts_ch_0_batch");
  batchGr.initialize();
  var batchId = "BATCH-" + ("000" + (nextBatchSequence())).slice(-3);
  batchGr.setValue("batch_id", batchId);
  batchGr.setValue("source_file_name", summarise(files));
  batchGr.setValue("storage_path", "sys_attachment:" + batchId);
  batchGr.setValue("total_files", files.length);
  batchGr.setValue("worker_threads", poolSize);
  batchGr.setValue("status", "PROCESSING");
  batchGr.setValue("submitted_at", new GlideDateTime());
  var batchSysId = batchGr.insert();

  var used = {};
  var totalCheques = 0;
  var chequeSysIds = [];

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var originalName = file.fileName || "unnamed.pdf";
    var ext = extensionOf(originalName);
    var chequeId = uniqueId(baseName(originalName), used);

    var recGr = new GlideRecord("x_2210302_cts_ch_0_record");
    recGr.initialize();
    recGr.setValue("batch_id", batchId);
    recGr.setValue("cheque_id", chequeId);
    recGr.setValue("source_file_name", originalName);
    recGr.setValue("page_number", 1);

    if (ACCEPTED_EXTENSIONS.indexOf(ext) === -1) {
      recGr.setValue("status", "OCR_FAILED");
      recGr.setValue("error_message", "unsupported file type '" + ext + "'");
      recGr.setValue("needs_review", true);
      var failedId = recGr.insert();
      totalCheques++;
      continue;
    }

    var recSysId = recGr.insert();
    var attSysId = new GlideSysAttachment().write(
      recGr,
      chequeId + ext,
      file.contentType || "application/octet-stream",
      file.data
    );
    recGr.setValue("attachment_sys_id", attSysId);
    recGr.update();

    chequeSysIds.push(recSysId);
    totalCheques++;
  }

  batchGr.setValue("total_cheques", totalCheques);
  batchGr.update();

  if (!unlimited() && totalCheques > maxCheques()) {
    return badRequest(response, "Uploaded files contain " + totalCheques + " cheques — max " + maxCheques());
  }

  gs.eventQueue("x_2210302_cts_ch_0.process_batch", batchGr, batchId, String(poolSize));

  response.setStatus(200);
  response.setBody({
    status: "PROCESSING",
    batchId: batchId,
    totalFiles: files.length,
    totalCheques: totalCheques,
  });
}

function summarise(files) {
  var first = files[0].fileName || "unnamed.pdf";
  return files.length === 1 ? first : first + " (+" + (files.length - 1) + " more)";
}

function nextBatchSequence() {
  var gr = new GlideAggregate("x_2210302_cts_ch_0_batch");
  gr.addAggregate("COUNT");
  gr.query();
  var count = 0;
  if (gr.next()) count = parseInt(gr.getAggregate("COUNT"), 10) || 0;
  return count + 1;
}

function badRequest(response, message) {
  response.setStatus(400);
  response.setBody({ error: message });
}

module.exports = {
  getConfig: getConfig,
  processBatch: processBatch,
  maxCheques: maxCheques,
  ACCEPTED_EXTENSIONS: ACCEPTED_EXTENSIONS,
};
