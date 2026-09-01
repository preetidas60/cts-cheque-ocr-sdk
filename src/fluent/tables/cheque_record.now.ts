/**
 * ServiceNow Fluent Table Definition: x_snc_cheque_ocr_record
 * --------------------------------------------------------------
 * Defines application metadata schema for Individual Cheque Records.
 */

export const ChequeRecordTable = {
  name: "x_snc_cheque_ocr_record",
  label: "CTS Cheque Record",
  fields: {
    batch_id: { type: "string", maxLength: 100, label: "Batch ID", mandatory: true },
    cheque_id: { type: "string", maxLength: 100, label: "Cheque ID", mandatory: true },
    source_file_name: { type: "string", maxLength: 255, label: "Source File Name" },
    file_path: { type: "string", maxLength: 500, label: "File Path" },
    page_number: { type: "integer", label: "Page Number", defaultValue: 1 },
    status: { type: "choice", label: "Status", choices: ["PENDING", "PROCESSING", "PROCESSED", "OCR_FAILED"], defaultValue: "PENDING" },
    account_number: { type: "string", maxLength: 50, label: "Extracted Account Number" },
    account_number_confidence_percent: { type: "decimal", label: "Account Number Confidence %" },
    account_holder_name: { type: "string", maxLength: 150, label: "Account Holder Name" },
    account_holder_confidence_percent: { type: "decimal", label: "Account Holder Confidence %" },
    cheque_date: { type: "string", maxLength: 20, label: "Cheque Date" },
    cheque_date_confidence_percent: { type: "decimal", label: "Cheque Date Confidence %" },
    amount_in_words: { type: "string", maxLength: 255, label: "Amount In Words" },
    amount_in_words_confidence_percent: { type: "decimal", label: "Amount In Words Confidence %" },
    amount_in_figures: { type: "string", maxLength: 50, label: "Amount In Figures" },
    amount_in_figures_confidence_percent: { type: "decimal", label: "Amount In Figures Confidence %" },
    needs_review: { type: "boolean", label: "Needs Review", defaultValue: false },
    review_reasons: { type: "string", maxLength: 500, label: "Review Reasons" },
    error_message: { type: "string", maxLength: 500, label: "Error Message" },
    verified_account_number: { type: "string", maxLength: 50, label: "Operator Verified Account Number" },
    verified_by: { type: "string", maxLength: 100, label: "Verified By Operator" },
    verified_at: { type: "sys_date_time", label: "Verified At" },
    worker_thread_name: { type: "string", maxLength: 50, label: "Worker Thread Name" },
    ocr_duration_ms: { type: "integer", label: "OCR Duration (ms)" },
  },
};
