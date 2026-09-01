import type { ChequeBatch } from "../../types";

interface BatchListViewProps {
  batches: ChequeBatch[];
  onOpenBatch: (batchId: string) => void;
}

export default function BatchListView({ batches, onOpenBatch }: BatchListViewProps) {
  return (
    <section className="workspace">
      <div className="tab">Signature Verification - Level 1 - Full A/C No Data Entry</div>

      <div className="batch">
        <div className="batch-head">
          Select Batch
          <span className="chevron">⌃</span>
        </div>

        <div className="batch-list-grid">
          {batches.map((batch) => (
            <div
              className="batch-card"
              key={batch.id}
              onClick={() => onOpenBatch(batch.id)}
            >
              <div className="batch-card-top">
                <span className="batch-card-icon">📁</span>
                <span className="batch-card-title">{batch.label}</span>
              </div>

              <div className="batch-card-stats">
                <div className="stat">
                  <div className="label">Batch Count / Amount</div>
                  <div className="value red">
                    {batch.chequeCount} / {batch.amount}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Processed / Pending</div>
                  <div className="value red">
                    {batch.processedCount} / {batch.pendingCount}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Clearing Type</div>
                  <div className="value red">{batch.clearingType}</div>
                </div>
                <div className="stat">
                  <div className="label">Cycle No</div>
                  <div className="value red">{batch.cycleNo}</div>
                </div>
              </div>

              <div className="batch-card-open">Open Batch ›</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
