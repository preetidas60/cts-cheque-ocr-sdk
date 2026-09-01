import { useCallback, useState } from "react";
import TopBar from "./components/TopBar/TopBar";
import InfoBar from "./components/TopBar/InfoBar";
import Sidebar from "./components/Sidebar/Sidebar";
import Workspace from "./components/Workspace/Workspace";
import BatchListView from "./components/Workspace/BatchListView";
import PdfListView from "./components/Workspace/PdfListView";
import MessagesPanel from "./components/MessagesPanel/MessagesPanel";
import Watermark from "./components/Watermark/Watermark";
import { menuTree } from "./data/menuTree";
import { messages } from "./data/messages";
import { batchStatsFor, confidenceLevel } from "./data/chequeBatches";
import { useBatchDetail, useBatchList } from "./hooks/useChequeBatches";
import { BatchProcessorView } from "./components/Workspace/BatchProcessorView";
import { verifyCheque } from "./api/client";
import { OPERATOR_ID } from "./config/clearing";

const WATERMARK_LINES = [
  "11-08-2026   15:55",
  "666256   11-08-2026",
  "11-08-2026   15:55",
  "666256",
];

type NavView = "batches" | "pdfs" | "cheque" | "batch-upload";

/**
 * Placeholder pane for loading/empty/error states.
 *
 * Reuses the existing .workspace / .batch / .batch-head classes so the chrome
 * around it is byte-identical to a loaded screen — the panel doesn't jump when
 * data arrives.
 */
function Placeholder({ tab, title, message }: { tab: string; title: string; message: string }) {
  return (
    <section className="workspace">
      <div className="tab">{tab}</div>
      <div className="batch">
        <div className="batch-head">
          {title}
          <span className="chevron">⌃</span>
        </div>
        <div className="batch-list-grid">
          <div className="batch-card">
            <div className="batch-card-top">
              <span className="batch-card-title">{message}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TAB_LABEL = "Signature Verification - Level 1 - Full A/C No Data Entry";

export default function App() {
  const [navView, setNavView] = useState<NavView>("batches");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // The batch list, and — only once a batch is opened — that batch with its
  // cheque rows. Two calls rather than one because the list endpoint
  // deliberately doesn't ship every cheque of every batch.
  const batches = useBatchList();
  const batchDetail = useBatchDetail(selectedBatchId);

  const selectedBatch = batchDetail.data;
  const selectedFile =
    selectedBatch?.files.find((f) => f.uniqueId === selectedFileId) ?? null;

  const goToBatches = () => {
    setNavView("batches");
    setSelectedBatchId(null);
    setSelectedFileId(null);
  };

  const goToPdfs = (batchId: string) => {
    setSelectedBatchId(batchId);
    setSelectedFileId(null);
    setNavView("pdfs");
  };

  const goToCheque = (fileId: string) => {
    setSelectedFileId(fileId);
    setNavView("cheque");
  };

  const handleSidebarSelect = (id: string) => {
    // Full A/C No Data Entry always re-enters the flow at the batch list.
    if (id === "full-ac-entry") goToBatches();
    if (id === "batch-upload") setNavView("batch-upload");
  };

  /**
   * Saves the operator's confirmed account number against this cheque.
   *
   * The batch is reloaded afterwards so the stats and rows reflect the save —
   * the backend clears needsReview on a verified cheque, and the panel would
   * otherwise keep showing stale counts until the operator navigated away.
   */
  const handleSubmitAccountNumber = useCallback(
    async (value: string) => {
      if (!selectedBatchId || !selectedFileId) return;
      // OPERATOR_ID is still shown in the InfoBar (it's a display constant,
      // same as before) but is no longer sent to the server — verified_by
      // now comes from the authenticated session on the ServiceNow side.
      await verifyCheque(selectedBatchId, selectedFileId, value);
      batchDetail.reload();
    },
    [selectedBatchId, selectedFileId, batchDetail],
  );

  return (
    <>
      <TopBar title="ExpressClear - CTS Ver : 3.1.0 UAT Release 1.0.20 : Main" />

      <InfoBar
        userId={OPERATOR_ID}
        lastLogin="29-JUL-2026 18:00:07"
        clearingDate="17-MAR-2026"
        group="400 MUMBAI"
      />

      <div className="app">
        <div className="app-top">
          <Sidebar tree={menuTree} onSelectNode={handleSidebarSelect} />

          {navView === "batches" &&
            (batches.loading ? (
              <Placeholder tab={TAB_LABEL} title="Select Batch" message="Loading batches…" />
            ) : batches.error ? (
              <Placeholder tab={TAB_LABEL} title="Select Batch" message={batches.error} />
            ) : !batches.data?.length ? (
              <Placeholder
                tab={TAB_LABEL}
                title="Select Batch"
                message="No batches yet — submit cheques to the backend first."
              />
            ) : (
              <BatchListView batches={batches.data} onOpenBatch={goToPdfs} />
            ))}

          {navView === "pdfs" &&
            (batchDetail.loading ? (
              <Placeholder tab={TAB_LABEL} title="Cheque Files" message="Loading cheques…" />
            ) : batchDetail.error ? (
              <Placeholder tab={TAB_LABEL} title="Cheque Files" message={batchDetail.error} />
            ) : selectedBatch ? (
              <PdfListView
                batch={selectedBatch}
                onOpenFile={goToCheque}
                onBack={goToBatches}
              />
            ) : null)}

          {navView === "cheque" && selectedFile && selectedBatch && (
            <Workspace
              key={selectedFile.uniqueId}
              tabLabel={TAB_LABEL}
              confidence={Math.round(selectedFile.accountNumberConfidence)}
              confidenceLevel={confidenceLevel(selectedFile.accountNumberConfidence)}
              initialOcrValue={selectedFile.accountNumber}
              stats={batchStatsFor(selectedBatch)}
              initialImageSrc={selectedFile.image}
              onClose={() => goToPdfs(selectedBatch.id)}
              onSubmitAccountNumber={handleSubmitAccountNumber}
            />
          )}

          {navView === "batch-upload" && <BatchProcessorView />}
        </div>

        <MessagesPanel rows={messages} />
      </div>

      <Watermark lines={WATERMARK_LINES} />
    </>
  );
}
