import { useCallback, useRef, useState } from "react";

/** Strips everything but digits and caps length at 20, matching digitsOnly() in script.js. */
export function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 20);
}

interface UseAccountNumberOptions {
  initialOcrValue: string;
  /**
   * Persists the confirmed number. Optional so the hook still works with no
   * backend attached, which is how it behaved before the integration.
   */
  onSubmit?: (value: string) => Promise<unknown>;
}

/**
 * Reproduces the OCR field / Full Account Number field / Copy / Submit
 * behaviour from the original script.js.
 */
export function useAccountNumber({ initialOcrValue, onSubmit }: UseAccountNumberOptions) {
  const [ocrValue, setOcrValue] = useState(sanitizeDigits(initialOcrValue));
  const [fullValue, setFullValue] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fullInputRef = useRef<HTMLInputElement | null>(null);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onOcrChange = useCallback((value: string) => {
    setOcrValue(sanitizeDigits(value));
  }, []);

  const onFullChange = useCallback((value: string) => {
    setFullValue(sanitizeDigits(value));
  }, []);

  const handleCopy = useCallback(() => {
    setFullValue(ocrValue);
    setIsCopied(true);

    if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setIsCopied(false), 1500);
  }, [ocrValue]);

  const handleSubmit = useCallback(async () => {
    if (!fullValue || isSubmitting) return;

    // With no onSubmit wired the original local-only behaviour is preserved
    // exactly: flash "Submitted" for 1500ms and nothing else.
    if (onSubmit) {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await onSubmit(fullValue);
      } catch (err: unknown) {
        // The tick must not appear if the save did not happen.
        setSubmitError(err instanceof Error ? err.message : String(err));
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }

    setIsSubmitted(true);
    if (submittedTimeout.current) clearTimeout(submittedTimeout.current);
    submittedTimeout.current = setTimeout(() => setIsSubmitted(false), 1500);
  }, [fullValue, isSubmitting, onSubmit]);

  return {
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
  };
}
