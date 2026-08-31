import { sqlBaseProperties } from '@forklaunch/blueprint-core';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';

// Global reference/lookup table, bulk-loaded by the ICD-10-CM ETL loader
// (§7) — not org-scoped, since ICD-10-CM is free, public CDC/NCHS data
// shared identically across every tenant. Populated by
// scripts/refresh-code-sets.ts, never hand-seeded.
export const Icd10Code = defineComplianceEntity({
  name: 'Icd10Code',
  properties: {
    ...sqlBaseProperties,
    code: fp.string().unique().compliance('none'),
    description: fp.string().compliance('none'),
    // The CDC/NCHS release this row came from — effective October 1 each
    // year (§7).
    effectiveDate: fp.datetime().nullable().compliance('none')
  }
});
