// Free, non-AMA mock LCD/NCD-style diagnosis-procedure crosswalk — "which
// diagnoses justify which mock procedures," carrying the same shape as a
// real MAC's Local Coverage Determination without any real CMS coverage
// data. The diagnosis codes themselves are real, free ICD-10-CM codes (no
// license needed for those); only the procedure side is a mock placeholder.
// Illustrative only — a coding/compliance SME should review this crosswalk
// before treating it as more than a scrubbing-engine test fixture. See
// plan/cac/MEDICAL-CODING-IMPLEMENTATION-PLAN.md §6, §12 item 3.
import { CPT_SHAPED_LCD_CROSSWALK } from './cptShapedFixture';

// Includes both the "PROC-XXX" placeholder entries and the CPT-*shaped*
// synthetic entry (§5 readiness bar) — same lookup, same function.
export const MOCK_LCD_CROSSWALK: Record<string, ReadonlyArray<string>> = {
  // Office Visit — justified by an acute condition needing evaluation.
  'PROC-001': ['J06.9'], // Acute upper respiratory infection, unspecified
  // Annual Physical Exam — justified by a routine/preventive encounter.
  'PROC-002': ['Z00.00'], // Encounter for general adult medical exam w/o abnormal findings
  // Diagnostic Lab Panel — justified by a finding that warrants lab workup.
  'PROC-003': ['R73.09'], // Other abnormal glucose
  ...CPT_SHAPED_LCD_CROSSWALK
};

export function isMedicallyNecessary(
  procedureCode: string,
  diagnosisCodes: ReadonlyArray<string>
): boolean {
  const justifyingDiagnoses = MOCK_LCD_CROSSWALK[procedureCode];
  if (!justifyingDiagnoses) {
    // No mock crosswalk entry for this procedure — nothing to check against,
    // so it isn't flagged as medically unnecessary by this mock data.
    return true;
  }
  return diagnosisCodes.some((code) => justifyingDiagnoses.includes(code));
}
