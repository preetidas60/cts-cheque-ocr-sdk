import type { BatchStat, ConfidenceLevel } from "../../types";
import ChequeArea from "./ChequeArea";
import BatchStats from "./BatchStats";
import SideTools from "./SideTools";

interface BatchDetailsProps {
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  initialOcrValue: string;
  stats: BatchStat[];
  initialImageSrc?: string;
  onSubmitAccountNumber?: (value: string) => Promise<unknown>;
}

export default function BatchDetails({
  confidence,
  confidenceLevel,
  initialOcrValue,
  stats,
  initialImageSrc,
  onSubmitAccountNumber,
}: BatchDetailsProps) {
  return (
    <div className="batch">
      <div className="batch-head">
        Batch Details
        <span className="chevron">⌃</span>
      </div>

      <div className="batch-main">
        <ChequeArea
          confidence={confidence}
          confidenceLevel={confidenceLevel}
          initialOcrValue={initialOcrValue}
          initialImageSrc={initialImageSrc}
          onSubmitAccountNumber={onSubmitAccountNumber}
        />
        <BatchStats stats={stats} />
        <SideTools />
      </div>
    </div>
  );
}
