import type { BatchDetail, BatchSummary, ChequeDetail, UiConfig } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "/api/cheques";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    /* not JSON — fall through */
  }
  return `${res.status} ${res.statusText}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return (await res.json()) as T;
}

export const getConfig = () => request<UiConfig>("/config");

export const listBatches = () => request<BatchSummary[]>("/batches");

export const getBatch = (batchId: string) =>
  request<BatchDetail>(`/batches/${encodeURIComponent(batchId)}`);

export const getCheque = (batchId: string, chequeId: string) =>
  request<ChequeDetail>(
    `/batches/${encodeURIComponent(batchId)}/cheques/${encodeURIComponent(chequeId)}`,
  );

export const verifyCheque = (batchId: string, chequeId: string, verifiedAccountNumber: string) =>
  request<ChequeDetail>(
    `/batches/${encodeURIComponent(batchId)}/cheques/${encodeURIComponent(chequeId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verifiedAccountNumber }),
    },
  );

export const processBatch = (files: File[], workerThreads?: number) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const qs = workerThreads ? `?workerThreads=${workerThreads}` : "";
  return request<{ status: string; batchId: string; totalFiles: number; totalCheques: number }>(
    `/process${qs}`,
    { method: "POST", body: form },
  );
};
