import type { BatchStat, ChequeBatch, ConfidenceLevel } from "../types";

/**
 * The mock manifest that used to live here — three hardcoded batches, twenty
 * specimen cheques and their bundled PNGs — is gone. Batches, cheque rows,
 * confidences and images all come from the backend now; see api/client.ts,
 * api/adapters.ts and hooks/useChequeBatches.ts.
 *
 * The two pure helpers below survive untouched, because they are presentation
 * logic rather than data: they decide how a number becomes a visual tier and
 * how a batch becomes four stat cards, and both still work exactly as before.
 */

/** Maps a numeric confidence % to the existing high/medium/low visual tiers. */
export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 95) return "high";
  if (confidence >= 80) return "medium";
  return "low";
}

/** Builds the same Batch Count / Processed / Clearing Type / Cycle stat cards for a given batch. */
export function batchStatsFor(batch: ChequeBatch): BatchStat[] {
  return [
    { label: "Batch Count / Amount", value: `${batch.chequeCount} / ${batch.amount}`, tone: "red" },
    // Was a hardcoded "0 / N" against the mock. Now the batch's real progress.
    { label: "Processed / Pending", value: `${batch.processedCount} / ${batch.pendingCount}`, tone: "red" },
    { label: "Clearing Type", value: batch.clearingType, tone: "red" },
    { label: "Cycle No", value: batch.cycleNo, tone: "red" },
  ];
}
