export type ConfidenceLevel = "high" | "medium" | "low";

export interface BatchStat {
  label: string;
  value: string;
  tone?: "red" | "blue";
}

export interface MessageRow {
  message: string;
  from: string;
  time: string;
}

export interface TreeNode {
  id: string;
  label: string;
  /** "arrow" rows are expandable/collapsible parent rows (▶ / ▼). */
  kind: "arrow" | "section" | "sub" | "divider";
  /** Only relevant for "arrow" rows. */
  expanded?: boolean;
  /** Extra visual styling hook (e.g. the blue sub-row). */
  variant?: "blue";
  active?: boolean;
}

/** A single cheque PDF that has been queued for Full A/C No Data Entry. */
export interface ChequeFile {
  /** e.g. "OCR-001" */
  uniqueId: string;
  /** e.g. "specimen_cheque_01.pdf" */
  fileName: string;
  accountNumber: string;
  accountNumberConfidence: number;
  accountName: string;
  accountNameConfidence: number;
  timeTakenSeconds: number;
  /** Rendered cheque image shown once this file is opened. */
  image: string;
}

/** A batch/folder of cheque PDFs, e.g. "BATCH-001". */
export interface ChequeBatch {
  id: string;
  label: string;
  amount: string;
  clearingType: string;
  cycleNo: string;

  /**
   * Counts come from the server, not from files.length.
   *
   * The batch LIST endpoint returns batch rows without their cheques — at 250
   * cheques a batch, shipping all of them just to render four stat lines would
   * be megabytes. So `files` is empty on a list card and only populated once a
   * batch is opened, which means files.length is not a usable count there.
   */
  chequeCount: number;
  processedCount: number;
  pendingCount: number;

  /** Empty on batch-list cards; populated by the batch-detail call. */
  files: ChequeFile[];
}
