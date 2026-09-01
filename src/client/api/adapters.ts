import type { ChequeBatch, ChequeFile } from "../types";
import { CLEARING_TYPE, CYCLE_NO } from "../config/clearing";
import type { BatchDetail, BatchSummary, ChequeDetail } from "./types";

/**
 * Backend DTO -> the app's own ChequeBatch / ChequeFile.
 *
 * This file exists so that NO component had to change shape. BatchListView,
 * PdfListView, ChequeArea and the rest still receive exactly the types they
 * received from the mock data module, with the same field names and the same
 * meanings. Swapping the data source is confined to here.
 */

/** "14,22,276.00" — Indian grouping, matching what the mock data showed. */
const AMOUNT_FORMAT = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(total: number | null): string {
  // Null means no cheque in the batch had a readable amount — which is a
  // different fact from "the amounts total zero", so it renders differently.
  return total == null ? "—" : AMOUNT_FORMAT.format(total);
}

/**
 * Batch-level counts.
 *
 * processedCount/failedCount are null while a batch is still PROCESSING, so
 * they fall back to 0 and everything not yet accounted for counts as pending.
 * A failed cheque is NOT pending — it is finished, badly — so it comes out of
 * the pending figure. Otherwise a batch with one unreadable file would sit at
 * "9 / 1" forever and look like it never completed.
 */
function counts(summary: BatchSummary) {
  const processed = summary.processedCount ?? 0;
  const failed = summary.failedCount ?? 0;
  const pending = Math.max(0, summary.totalCheques - processed - failed);
  return { processed, failed, pending };
}

export function toChequeFile(detail: ChequeDetail): ChequeFile {
  return {
    // The backend's chequeId IS the uploaded file name minus its extension,
    // which is precisely the "Unique ID" column's job here.
    uniqueId: detail.chequeId,
    fileName: detail.fileName ?? detail.chequeId,

    // A cheque that failed OCR has null everywhere. Empty string + 0% is how
    // that renders in the existing table — the row still appears, because one
    // unreadable file is a normal outcome on the backend, not a batch failure.
    accountNumber: detail.accountNumber.value ?? "",
    accountNumberConfidence: detail.accountNumber.confidencePercent ?? 0,
    accountName: detail.accountHolderName.value ?? "",
    accountNameConfidence: detail.accountHolderName.confidencePercent ?? 0,

    timeTakenSeconds: (detail.ocrDurationMs ?? 0) / 1000,

    // Server-built, already encoded, and relative — so it resolves through the
    // dev proxy and through Spring in production without a code change.
    image: detail.imageUrl,
  };
}

/**
 * A batch card WITHOUT its cheques. The list endpoint deliberately does not
 * ship every cheque of every batch — at 250 cheques each that would be
 * megabytes to render four stat lines. The counts come off the batch row
 * instead, which is why ChequeBatch carries them explicitly rather than
 * deriving them from files.length.
 */
export function toChequeBatch(summary: BatchSummary): ChequeBatch {
  const { processed, pending } = counts(summary);
  return {
    id: summary.batchId,
    label: summary.batchId,
    amount: formatAmount(summary.totalAmountInFigures),
    clearingType: CLEARING_TYPE,
    cycleNo: CYCLE_NO,
    chequeCount: summary.totalCheques,
    processedCount: processed,
    pendingCount: pending,
    files: [],
  };
}

/** The same batch WITH its cheques, for PdfListView and the cheque viewer. */
export function toChequeBatchDetail(detail: BatchDetail): ChequeBatch {
  return {
    ...toChequeBatch(detail.batch),
    files: detail.cheques.map(toChequeFile),
  };
}
