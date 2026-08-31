import { sqlBaseProperties } from '@forklaunch/blueprint-core';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';
import { ClaimStatus } from '../../domain/enum/claimStatus.enum';
import { Denial } from './denial.entity';
import { Encounter } from './encounter.entity';
import { Insurance } from './insurance.entity';
import { Patient } from './patient.entity';
import { Remittance } from './remittance.entity';

// A claim is built from one encounter's charges + diagnoses — see
// services/claim.service.ts for the builder/scrubbing orchestration (§6).
export const Claim = defineComplianceEntity({
  name: 'Claim',
  properties: {
    ...sqlBaseProperties,
    organizationId: fp.uuid().compliance('none'),
    patient: () => fp.manyToOne(Patient),
    encounter: () => fp.manyToOne(Encounter),
    // The payer being billed — nullable for self-pay claims.
    payer: () => fp.manyToOne(Insurance).nullable(),
    status: fp
      .enum(() => ClaimStatus)
      .default(ClaimStatus.DRAFT)
      .compliance('none'),
    remittances: () => fp.oneToMany(Remittance).mappedBy('claim'),
    denials: () => fp.oneToMany(Denial).mappedBy('claim')
  },
  userIdField: 'patient'
});
