import { sqlBaseProperties } from '@forklaunch/blueprint-core';
import { defineComplianceEntity, fp } from '@forklaunch/core/persistence';
import { Charge } from './charge.entity';
import { Diagnosis } from './diagnosis.entity';
import { Patient } from './patient.entity';

export const Encounter = defineComplianceEntity({
  name: 'Encounter',
  properties: {
    ...sqlBaseProperties,
    organizationId: fp.uuid().compliance('none'),
    patient: () => fp.manyToOne(Patient),
    // Provider is an IAM User (coder/biller-facing staff record lives in a
    // separate service) — stored as an id pointer, not a local relation.
    providerId: fp.uuid().compliance('none'),
    visitDate: fp.datetime().compliance('none'),
    diagnoses: () => fp.oneToMany(Diagnosis).mappedBy('encounter'),
    charges: () => fp.oneToMany(Charge).mappedBy('encounter')
  },
  userIdField: 'patient'
});
