import type { TreeNode } from "../types";

/**
 * Static representation of the left-hand navigation tree.
 * Mirrors the original static markup 1:1 (labels, order, active/blue states).
 */
export const menuTree: TreeNode[] = [
  { id: "tcwise", label: "Tcwise Image Extraction", kind: "arrow" },
  { id: "cpps", label: "CPPS Processing", kind: "arrow" },
  { id: "gefu", label: "GEFU GENERATION", kind: "arrow" },
  { id: "divider-1", label: "", kind: "divider" },

  { id: "svs", label: "SVS", kind: "section", expanded: true },
  {
    id: "sig-verify-1",
    label: "Signature Verification - Level 1",
    kind: "arrow",
    expanded: true,
  },
  {
    id: "full-ac-entry",
    label: "Full A/C No Data Entry",
    kind: "sub",
    active: true,
  },
  {
    id: "first-level-sig",
    label: "First Level Signature Verification",
    kind: "sub",
    variant: "blue",
  },
  {
    id: "batch-upload",
    label: "Batch Upload & Realtime OCR",
    kind: "sub",
    variant: "blue",
  },

  { id: "sig-verify-2", label: "Signature Verification - Level 2", kind: "arrow" },
  { id: "sig-viewer", label: "Signature Viewer", kind: "arrow" },
  { id: "divider-2", label: "", kind: "divider" },

  { id: "reports", label: "REPORTS", kind: "section", expanded: true },
  { id: "inward-report", label: "Inward Report", kind: "arrow" },
];
