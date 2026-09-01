/**
 * Clearing-house metadata for the batch cards.
 *
 * The OCR backend deliberately does not model any of this — it processes
 * cheque images and extracts fields; it knows nothing about clearing types or
 * cycle numbers, and there is no column anywhere in `batch` or `cheque_record`
 * that could supply them. The mock data hardcoded "NON-CTS" / "06" / "07".
 *
 * Rather than invent per-batch values the server never sent, they live here as
 * one honest constant. When the real clearing-house feed exists, this is the
 * single file to replace — and the two `stat` cards that read it will keep
 * rendering exactly as they do now.
 */
export const CLEARING_TYPE = "NON-CTS";
export const CYCLE_NO = "06";

/** Who a verification is recorded against. No auth exists yet — see README. */
export const OPERATOR_ID = "UAT0104";
