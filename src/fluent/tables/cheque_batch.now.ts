/**
 * ServiceNow Fluent Table Definition: x_snc_cheque_ocr_batch
 * -------------------------------------------------------------
 * Defines application metadata schema for Cheque Batches.
 */

export const ChequeBatchTable = {
  name: "x_snc_cheque_ocr_batch",
  label: "CTS Cheque Batch",
  fields: {
    batch_id: { type: "string", maxLength: 100, label: "Batch ID", mandatory: true, unique: true },
    source_file_name: { type: "string", maxLength: 255, label: "Source File Name" },
    storage_path: { type: "string", maxLength: 500, label: "Storage Path" },
    total_files: { type: "integer", label: "Total Files", defaultValue: 0 },
    total_cheques: { type: "integer", label: "Total Cheques", defaultValue: 0 },
    worker_threads: { type: "integer", label: "Worker Threads", defaultValue: 4 },
    processed_count: { type: "integer", label: "Processed Count", defaultValue: 0 },
    failed_count: { type: "integer", label: "Failed Count", defaultValue: 0 },
    status: { type: "choice", label: "Processing Status", choices: ["PROCESSING", "COMPLETED", "FAILED"], defaultValue: "PROCESSING" },
    submitted_at: { type: "sys_date_time", label: "Submitted At" },
    completed_at: { type: "sys_date_time", label: "Completed At" },
    processing_time_seconds: { type: "decimal", label: "Processing Time (Seconds)" },
    total_amount_in_figures: { type: "currency", label: "Total Amount in Figures" },
  },
};
