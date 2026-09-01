import type { BatchStat, ConfidenceLevel } from "../../types";
import WorkspaceTab from "./WorkspaceTab";
import BatchDetails from "./BatchDetails";

interface WorkspaceProps {
  tabLabel: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  initialOcrValue: string;
  stats: BatchStat[];
  initialImageSrc?: string;
  onClose?: () => void;
  onSubmitAccountNumber?: (value: string) => Promise<unknown>;
}

export default function Workspace({
  tabLabel,
  confidence,
  confidenceLevel,
  initialOcrValue,
  stats,
  initialImageSrc,
  onClose,
  onSubmitAccountNumber,
}: WorkspaceProps) {
  return (
    <section className="workspace">
      <WorkspaceTab label={tabLabel} onClose={onClose} />
      <BatchDetails
        confidence={confidence}
        confidenceLevel={confidenceLevel}
        initialOcrValue={initialOcrValue}
        stats={stats}
        initialImageSrc={initialImageSrc}
        onSubmitAccountNumber={onSubmitAccountNumber}
      />
    </section>
  );
}
