import {
  handlers,
  optional,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';
import type { WorklistStatus } from '../../domain/enum/worklistStatus.enum';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const serviceFactory = ci.scopedResolver(tokens.DenialWorklistService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

const denialResponseSchema = {
  id: string,
  claimId: string,
  carcCode: string,
  category: string,
  worklistStatus: string,
  resolvedAt: optional(string)
};

// Denial worklist API — the one piece of the old "eligibility & remittance"
// phase that never depended on Stedi (plan §12 item 12, §14). Every row
// here comes from ScrubbingService (§6); this is a query/status layer over
// Denial rows the claim engine already creates, not a new source of them.
export const listDenials = handlers.get(
  schemaValidator,
  '/',
  {
    name: 'List Denials',
    access: 'internal',
    summary: 'Lists denial worklist entries, optionally filtered',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    query: {
      claimId: optional(string),
      worklistStatus: optional(string)
    },
    responses: {
      200: schemaValidator.array(denialResponseSchema)
    }
  },
  async (req, res) => {
    const { claimId, worklistStatus } = req.query;
    openTelemetryCollector.debug('Listing denials', {
      claimId,
      worklistStatus
    });
    const denials = await serviceFactory().listDenials({
      claimId,
      worklistStatus: worklistStatus as WorklistStatus | undefined
    });
    res.status(200).json(
      denials.map((denial) => ({
        id: denial.id,
        claimId: denial.claim.id,
        carcCode: denial.carcCode,
        category: denial.category,
        worklistStatus: denial.worklistStatus,
        resolvedAt: denial.resolvedAt?.toISOString()
      }))
    );
  }
);

export const getDenial = handlers.get(
  schemaValidator,
  '/:id',
  {
    name: 'Get Denial',
    access: 'internal',
    summary: 'Fetches a single denial worklist entry',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    params: {
      id: string
    },
    responses: {
      200: denialResponseSchema,
      404: string
    }
  },
  async (req, res) => {
    const { id } = req.params;
    const denial = await serviceFactory().getDenial(id);

    if (!denial) {
      res.status(404).send(`Denial '${id}' not found`);
      return;
    }

    res.status(200).json({
      id: denial.id,
      claimId: denial.claim.id,
      carcCode: denial.carcCode,
      category: denial.category,
      worklistStatus: denial.worklistStatus,
      resolvedAt: denial.resolvedAt?.toISOString()
    });
  }
);

export const resolveDenial = handlers.post(
  schemaValidator,
  '/:id/resolve',
  {
    name: 'Resolve Denial',
    access: 'internal',
    summary: 'Marks a denial worklist entry resolved',
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    params: {
      id: string
    },
    responses: {
      200: denialResponseSchema,
      404: string
    }
  },
  async (req, res) => {
    const { id } = req.params;
    const denial = await serviceFactory().resolveDenial(id);

    if (!denial) {
      res.status(404).send(`Denial '${id}' not found`);
      return;
    }

    openTelemetryCollector.info('Resolved denial via API', { id });
    res.status(200).json({
      id: denial.id,
      claimId: denial.claim.id,
      carcCode: denial.carcCode,
      category: denial.category,
      worklistStatus: denial.worklistStatus,
      resolvedAt: denial.resolvedAt?.toISOString()
    });
  }
);
