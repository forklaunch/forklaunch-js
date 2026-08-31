import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { EntityManager } from '@mikro-orm/postgresql';
import { ClaimStatus } from '../domain/enum/claimStatus.enum';
import { Claim } from '../persistence/entities/claim.entity';
import { Denial } from '../persistence/entities/denial.entity';

export interface AnalyticsDateRange {
  since?: Date;
  until?: Date;
}

export interface ClaimAnalyticsSummary {
  totalScrubbedClaims: number;
  // 0-100. Complementary by construction: every scrubbed claim ends up
  // READY (clean) or DENIED (§6) — there's no partial-clean state.
  cleanClaimRate: number;
  denialRate: number;
  denialsByCategory: Record<string, number>;
}

// Reports the two of §11's three success metrics we can actually compute:
// clean-claim-rate and denial-rate, both derived from Claim/Denial data
// cac-base owns outright. Average-days-to-payment is dropped — it needs
// real remittance timing, which is out of scope entirely now (§8, §14),
// not just deferred. See plan §12 (RBAC/analytics scope note, §14 PR 5).
export class AnalyticsService {
  constructor(
    private readonly em: EntityManager,
    private readonly otel: OpenTelemetryCollector<MetricsDefinition>
  ) {}

  async getClaimSummary(
    range?: AnalyticsDateRange
  ): Promise<ClaimAnalyticsSummary> {
    const createdAtFilter = buildDateFilter(range);

    const [readyCount, deniedCount, denials] = await Promise.all([
      this.em.count(Claim, {
        status: ClaimStatus.READY,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
      }),
      this.em.count(Claim, {
        status: ClaimStatus.DENIED,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
      }),
      // Filtered by the parent claim's createdAt, not the denial's own —
      // a claim can be built on one day and scrubbed (denial created) on
      // another, and this must stay in the same date window as
      // readyCount/deniedCount above or denialsByCategory silently drifts
      // out of sync with deniedCount.
      this.em.find(
        Denial,
        createdAtFilter ? { claim: { createdAt: createdAtFilter } } : {}
      )
    ]);

    const totalScrubbedClaims = readyCount + deniedCount;
    const cleanClaimRate =
      totalScrubbedClaims === 0 ? 0 : (readyCount / totalScrubbedClaims) * 100;
    const denialRate =
      totalScrubbedClaims === 0 ? 0 : (deniedCount / totalScrubbedClaims) * 100;

    const denialsByCategory: Record<string, number> = {};
    for (const denial of denials) {
      denialsByCategory[denial.category] =
        (denialsByCategory[denial.category] ?? 0) + 1;
    }

    const summary: ClaimAnalyticsSummary = {
      totalScrubbedClaims,
      cleanClaimRate,
      denialRate,
      denialsByCategory
    };
    this.otel.debug('Computed claim analytics summary', summary);
    return summary;
  }
}

function buildDateFilter(
  range?: AnalyticsDateRange
): { $gte?: Date; $lte?: Date } | undefined {
  if (!range?.since && !range?.until) return undefined;
  const filter: { $gte?: Date; $lte?: Date } = {};
  if (range.since) filter.$gte = range.since;
  if (range.until) filter.$lte = range.until;
  return filter;
}
