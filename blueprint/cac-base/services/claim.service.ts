import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { ScrubbingService } from '@forklaunch/implementation-cac-base/services';
import type { DenialReasonCategory as MockDenialReasonCategory } from '@forklaunch/implementation-cac-base/services';
import { EntityManager } from '@mikro-orm/postgresql';
import { ClaimStatus } from '../domain/enum/claimStatus.enum';
import { DenialReasonCategory } from '../domain/enum/denialReasonCategory.enum';
import { Claim } from '../persistence/entities/claim.entity';
import { Denial } from '../persistence/entities/denial.entity';
import { Encounter } from '../persistence/entities/encounter.entity';

export interface ScrubClaimResult {
  status: ClaimStatus;
  denials: Denial[];
}

// Builds a claim from one encounter's charges + diagnoses, then runs it
// through the three-layer scrubbing engine (§6). Lives in cac-base, not
// implementations/cac/base, because it needs the real entities — unlike
// CodeSetProvider, there's no swappable mock/real variant of "how a claim
// gets built," since cac has only one variant (cac-base, §3). The scrubbing
// *logic* itself (ScrubbingService) is a pure function with no DB
// dependency, so it stays in implementations/cac/base and is reused as-is.
export class ClaimService {
  constructor(
    private readonly em: EntityManager,
    private readonly scrubbingService: ScrubbingService,
    private readonly otel: OpenTelemetryCollector<MetricsDefinition>
  ) {}

  async buildClaim(encounterId: string): Promise<Claim> {
    const encounter = await this.em.findOneOrFail(
      Encounter,
      { id: encounterId },
      { populate: ['charges', 'diagnoses', 'patient'] }
    );

    const claim = this.em.create(Claim, {
      organizationId: encounter.organizationId,
      patient: encounter.patient,
      encounter,
      status: ClaimStatus.DRAFT
    });

    await this.em.persist(claim).flush();

    this.otel.info('Built claim from encounter', {
      claimId: claim.id,
      encounterId
    });

    return claim;
  }

  async scrubClaim(claimId: string): Promise<ScrubClaimResult> {
    const claim = await this.em.findOneOrFail(
      Claim,
      { id: claimId },
      { populate: ['encounter', 'encounter.charges', 'encounter.diagnoses'] }
    );

    const lines = claim.encounter.charges
      .getItems()
      .map((charge) => ({
        procedureCode: charge.procedureCode,
        units: charge.units
      }));
    const diagnosisCodes = claim.encounter.diagnoses
      .getItems()
      .map((diagnosis) => diagnosis.icd10Code);

    const result = this.scrubbingService.scrub(lines, diagnosisCodes);

    const denials = result.findings.map((finding) =>
      this.em.create(Denial, {
        organizationId: claim.organizationId,
        claim,
        carcCode: finding.carcCode,
        category: mapMockCategory(finding.category),
        worklistStatus: 'open'
      })
    );

    claim.status = result.clean ? ClaimStatus.READY : ClaimStatus.DENIED;

    if (denials.length > 0) {
      this.em.persist(denials);
    }
    await this.em.persist(claim).flush();

    this.otel.info('Scrubbed claim', {
      claimId,
      status: claim.status,
      findingCount: result.findings.length
    });

    return { status: claim.status, denials };
  }
}

function mapMockCategory(
  category: MockDenialReasonCategory
): DenialReasonCategory {
  switch (category) {
    case 'ncci_ptp':
      return DenialReasonCategory.NCCI_PTP;
    case 'ncci_mue':
      return DenialReasonCategory.NCCI_MUE;
    case 'lcd_ncd':
      return DenialReasonCategory.LCD_NCD;
  }
}
