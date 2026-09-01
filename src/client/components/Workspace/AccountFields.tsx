import type { ConfidenceLevel } from "../../types";
import { useAccountNumber } from "../../hooks/useAccountNumber";

interface AccountFieldsProps {
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  initialOcrValue: string;
  onUploadClick: () => void;
  /** Persists the confirmed number. Omit for the old local-only behaviour. */
  onSubmitAccountNumber?: (value: string) => Promise<unknown>;
}

export default function AccountFields({
  confidence,
  confidenceLevel,
  initialOcrValue,
  onSubmitAccountNumber,
}: AccountFieldsProps) {
  const {
    ocrValue,
    fullValue,
    isCopied,
    isSubmitted,
    isSubmitting,
    submitError,
    fullInputRef,
    onOcrChange,
    onFullChange,
    handleCopy,
    handleSubmit,
  } = useAccountNumber({ initialOcrValue, onSubmit: onSubmitAccountNumber });

  return (
    <>
      {/* Row 1: Confidence + OCR extracted account number + Copy + Upload */}
      <div className="account-row">
        <div className="field-group confidence-group">
          <label>Confidence:</label>
          <span
            id="confidenceValue"
            className={`confidence-value ${confidenceLevel}`}
          >
            {confidence}%
          </span>
        </div>

        <div className="field-group account-group">
          <label>OCR Extracted Account Number:</label>
          <input
            id="ocrAccountNumber"
            value={ocrValue}
            onChange={(e) => onOcrChange(e.target.value)}
            readOnly
          />
        </div>

        <button
          id="copyBtn"
          className={`copy-btn${isCopied ? " copied" : ""}`}
          title="Copy to Full Account Number"
          type="button"
          onClick={handleCopy}
        >
          <span className="copy-icon">{isCopied ? "✓" : "⧉"}</span>
          {isCopied ? " Copied" : " Copy"}
        </button>
      </div>

      {/* Row 2: Full Account Number (always editable) */}
      <div className="full-account-row">
        <div className="field-group account-group">
          <label>Full Account Number:</label>
          <input
            id="fullAccountNumber"
            ref={fullInputRef}
            value={fullValue}
            onChange={(e) => onFullChange(e.target.value)}
            placeholder="Enter account number"
          />
        </div>

        <button
          id="submitBtn"
          className={`submit-btn${isSubmitted ? " submitted" : ""}`}
          title="Submit Full Account Number"
          type="button"
          disabled={!fullValue || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitted ? "✓ Submitted" : isSubmitting ? "Saving…" : "Submit"}
        </button>
      </div>

      {submitError && (
        <div className="full-account-row">
          <span className="confidence-value low">{submitError}</span>
        </div>
      )}
    </>
  );
}
