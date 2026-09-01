/**
 * ServiceNow Fluent Business Rule Definition
 * --------------------------------------------
 * Handles automatic clearing of needs_review and audit logging upon human verification.
 */

export const ChequeVerificationBusinessRule = {
  name: "Verify Cheque Account Number",
  table: "x_snc_cheque_ocr_record",
  when: "before",
  action: ["update"],
  condition: "current.verified_account_number.changes()",
  script: `
    (function executeRule(current, previous) {
      if (current.verified_account_number) {
        current.needs_review = false;
        current.verified_at = new GlideDateTime().getValue();
        gs.info('Cheque ' + current.cheque_id + ' verified by operator.');
      }
    })(current, previous);
  `,
};
