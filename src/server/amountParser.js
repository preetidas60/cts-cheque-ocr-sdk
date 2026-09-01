/**
 * amountParser.js
 * ---------------
 * Line-for-line port of ChequeQueryService#parseAmount (Java). Ported
 * exactly, not "cleaned up" — spec §8.3 calls this out by name as a trap:
 * a naive digit-strip turns "Rs. 4500/-" into ".4500", which parses as
 * 0.45 and understates a batch total by four orders of magnitude.
 *
 * Algorithm (unchanged from the Java):
 *   1. Strip everything except digits, ',' and '.'
 *   2. Remove all ',' — en-IN convention: comma always groups, never decimalises
 *   3. If multiple '.' remain, the LAST is the decimal point; earlier ones
 *      are misread grouping ("1.234.00" -> "1234.00")
 *   4. Strip LEADING dots — currency-prefix debris, not a decimal point
 *   5. Strip a trailing dot
 *   6. Empty or unparseable -> null, never 0.0
 *
 * Validated against the same 18 realistic OCR outputs cited in the spec:
 * "₹ 2500", "INR 1,00,000.50", "**5000**", "abc", "...", etc.
 */

/**
 * @param {string|null|undefined} raw - amount_in_figures exactly as OCR read it
 * @returns {number|null} parsed amount, or null when nothing usable was there
 */
function parseAmount(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return null;
  }

  let cleaned = String(raw).replace(/[^0-9.,]/g, "");

  // ',' always groups in this en-IN context — drop it outright rather than
  // guess per-string.
  cleaned = cleaned.replace(/,/g, "");

  // OCR sometimes doubles the separator ("1.234.00"). The LAST dot is the
  // real decimal point; earlier ones are misread grouping.
  const lastDot = cleaned.lastIndexOf(".");
  if (lastDot >= 0) {
    const beforeLastDot = cleaned.substring(0, lastDot).replace(/\./g, "");
    cleaned = beforeLastDot + cleaned.substring(lastDot);
  }

  // A LEADING dot is currency-prefix debris ("Rs. 4500/-" -> ".4500"),
  // not a decimal point. Left in place this parses as 0.45.
  while (cleaned.startsWith(".")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith(".")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  if (cleaned === "") {
    return null;
  }

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

module.exports = { parseAmount };
