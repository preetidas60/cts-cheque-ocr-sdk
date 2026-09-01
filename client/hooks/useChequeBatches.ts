import { useEffect } from "react";
import { getBatch, listBatches } from "../api/client";
import { toChequeBatch, toChequeBatchDetail } from "../api/adapters";
import type { ChequeBatch } from "../types";
import { useAsync } from "./useAsync";

/**
 * The Spring version streamed NDJSON so a batch's rows filled in live while
 * OCR ran (POST /process/stream). A Scripted REST endpoint can't hold a
 * connection open like that (see api/client.ts), so a batch still marked
 * PROCESSING here polls instead — same end state, a few seconds' latency
 * instead of instant push. 3s matches the ~1 cheque/sec throughput cited in
 * the port spec, so a poll rarely lands on an unchanged batch.
 */
const POLL_MS = 3000;

/**
 * These return the app's OWN types, already adapted. App.tsx therefore reads
 * almost exactly as it did against the mock module — `batches` is still a
 * ChequeBatch[], `batch.files` is still a ChequeFile[].
 */

/** BatchListView — every batch, newest first, without their cheque rows. */
export function useBatchList() {
  return useAsync<ChequeBatch[]>(
    () => listBatches().then((rows) => rows.map(toChequeBatch)),
    [],
  );
}

/**
 * PdfListView and the cheque viewer — one batch WITH its cheques.
 *
 * Passing null is the "nothing selected" state rather than an error worth
 * showing, so it resolves to null instead of rejecting; App renders the batch
 * list in that case anyway.
 */
export function useBatchDetail(batchId: string | null) {
  const state = useAsync<ChequeBatch | null>(
    () => (batchId ? getBatch(batchId).then(toChequeBatchDetail) : Promise.resolve(null)),
    [batchId],
  );

  const stillProcessing = state.data?.pendingCount ? state.data.pendingCount > 0 : false;
  useEffect(() => {
    if (!batchId || !stillProcessing) return;
    const id = setInterval(state.reload, POLL_MS);
    return () => clearInterval(id);
  }, [batchId, stillProcessing, state.reload]);

  return state;
}
