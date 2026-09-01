import { useRef, useState } from "react";
import chequeSample from "../../assets/cheque-sample.png";
import type { ConfidenceLevel } from "../../types";
import ChequeViewer from "./ChequeViewer";
import AccountFields from "./AccountFields";

interface ChequeAreaProps {
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  initialOcrValue: string;
  /** Optional override for the cheque image (defaults to the sample placeholder). */
  initialImageSrc?: string;
  /** Persists the confirmed account number. Threaded straight to AccountFields. */
  onSubmitAccountNumber?: (value: string) => Promise<unknown>;
}

export default function ChequeArea({
  confidence,
  confidenceLevel,
  initialOcrValue,
  initialImageSrc,
  onSubmitAccountNumber,
}: ChequeAreaProps) {
  const [imageSrc, setImageSrc] = useState(initialImageSrc ?? chequeSample);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => uploadInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
  };

  return (
    <div className="cheque-area">
      <ChequeViewer imageSrc={imageSrc} />

      <AccountFields
        confidence={confidence}
        confidenceLevel={confidenceLevel}
        initialOcrValue={initialOcrValue}
        onUploadClick={handleUploadClick}
        onSubmitAccountNumber={onSubmitAccountNumber}
      />

      <input
        type="file"
        id="uploadImageInput"
        accept="image/*"
        hidden
        ref={uploadInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
}
