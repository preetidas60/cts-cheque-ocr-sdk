import type { ChequeBatch } from "../../types";

interface PdfListViewProps {
  batch: ChequeBatch;
  onOpenFile: (uniqueId: string) => void;
  onBack: () => void;
}

export default function PdfListView({ batch, onOpenFile, onBack }: PdfListViewProps) {
  return (
    <section className="workspace">
      <div className="tab">
        <span className="crumb-link" onClick={onBack}>
          Full A/C No Data Entry
        </span>
        <span className="crumb-sep">›</span>
        {batch.label}
      </div>

      <div className="batch">
        <div className="batch-head">
          {batch.label} — Cheque Files ({batch.files.length})
          <span className="chevron">⌃</span>
        </div>

        <div className="pdf-table">
          <div className="pdf-row pdf-head">
            <div>Unique ID</div>
            <div>File Name</div>
            <div>Account Number</div>
            <div>Confidence %</div>
            <div>Account Name</div>
            <div>Confidence %</div>
            <div>Time Taken (s)</div>
          </div>

          <div className="pdf-body">
            {batch.files.map((file) => (
              <div
                className="pdf-row"
                key={file.uniqueId}
                onClick={() => onOpenFile(file.uniqueId)}
              >
                <div>{file.uniqueId}</div>
                <div className="pdf-filename">📄 {file.fileName}</div>
                <div>{file.accountNumber}</div>
                <div>{file.accountNumberConfidence.toFixed(2)}%</div>
                <div>{file.accountName}</div>
                <div>{file.accountNameConfidence.toFixed(2)}%</div>
                <div>{file.timeTakenSeconds.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
