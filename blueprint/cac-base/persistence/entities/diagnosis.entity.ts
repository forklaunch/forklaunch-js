import { sqlBaseProperties } from '@forklaunch/blueprint-core';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';
import { Encounter } from './encounter.entity';

export const Diagnosis = defineComplianceEntity({
  name: 'Diagnosis',
  properties: {
    ...sqlBaseProperties,
    organizationId: fp.uuid().compliance('none'),
    encounter: () => fp.manyToOne(Encounter),
    // The code itself is public data (ICD-10-CM) — 'none', not 'phi'. See §4.
    icd10Code: fp.string().compliance('none')
  }
});
