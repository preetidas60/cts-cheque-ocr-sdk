/**
 * Mirrors the Java DTOs exactly. Nothing in here is a UI type — these are the
 * wire shapes, and they get converted into the app's own ChequeBatch /
 * ChequeFile types in api/adapters.ts.
 *
 * Keeping the two apart is what lets every component stay exactly as it was:
 * they still consume ChequeBatch and ChequeFile, and never see a backend DTO.
 *
 * The one rule worth restating from the backend README: every field carries
 * its OWN confidence and nothing is blended. `confidencePercent` is null
 * precisely when `value` is null, because there is nothing to be confident
 * about.
 */

export interface FieldResult {
  value: string | null;
  confidencePercent: number | null;
}

export type ChequeStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "OCR_FAILED";
export type BatchStatus = "PROCESSING" | "COMPLETED";

/** GET /api/cheques/config */
export interface UiConfig {
  defaultWorkerThreads: number;
  maxWorkerThreads: number;
  maxCheques: number;
  acceptedExtensions: string[];
}

/** GET /api/cheques/batches */
export interface BatchSummary {
  batchId: string;
  sourceFileName: string;
  totalFiles: number | null;
  totalCheques: number;
  processedCount: number | null;
  failedCount: number | null;
  workerThreads: number | null;
  status: BatchStatus;
  submittedAt: string;
  completedAt: string | null;
  processingTimeSeconds: number | null;
  /** null when no cheque in the batch had a readable amount. */
  totalAmountInFigures: number | null;
}

/** GET /api/cheques/batches/{batchId}/cheques/{chequeId} */
export interface ChequeDetail {
  batchId: string;
  chequeId: string;
  fileName: string;
  pageNumber: number;
  status: ChequeStatus;

  accountNumber: FieldResult;
  accountHolderName: FieldResult;
  chequeDate: FieldResult;
  amountInWords: FieldResult;
  amountInFigures: FieldResult;

  needsReview: boolean | null;
  reviewReasons: string[];

  verifiedAccountNumber: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;

  workerThreadName: string | null;
  ocrDurationMs: number | null;
  errorMessage: string | null;

  /** Server-built and already URL-encoded. Never construct these by hand. */
  imageUrl: string;
  fileUrl: string;
}

/** GET /api/cheques/batches/{batchId} */
export interface BatchDetail {
  batch: BatchSummary;
  cheques: ChequeDetail[];
}
