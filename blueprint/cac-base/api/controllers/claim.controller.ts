import {
  handlers,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const serviceFactory = ci.scopedResolver(tokens.ClaimService);
const HMAC_SECRET_KEY = ci.resolve(tokens.HMAC_SECRET_KEY);

// Claim engine + three-layer scrubbing (§6) — mock codes only, per Phase 2 /
// PR 3 scope (plan/cac/MEDICAL-CODING-IMPLEMENTATION-PLAN.md §10, §14).
export const buildClaim = handlers.post(
  schemaValidator,
  '/build',
  {
    name: 'Build Claim',
    access: 'internal',
    summary:
      "Builds a claim from an encounter's charges and diagnoses",
    auth: {
      hmac: {
        secretKeys: {
          default: HMAC_SECRET_KEY
        }
      }
    },
    body: {
      encounterId: string
    },
    responses: {
      200: {
        id: string,
        status: string
      }
    }
  },
  async (req, res) => {
    const { encounterId } = req.body;
    openTelemetryCollector.debug('Building claim', { encounterId });
    const claim = await serviceFactory().buildClaim(encounterId);
    res.status(200).json({ id: claim.id, status: claim.status });
  }
);

export const scrubClaim = handlers.post(
  schemaValidator,
  '/:id/scrub',
  {
    name: 'Scrub Claim',
    access: 'internal',
    summary:
      'Runs a claim through the NCCI PTP / NCCI MUE / LCD-NCD scrubbing engine',
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
      200: {
        status: string,
        denials: schemaValidator.array({
          carcCode: string,
          category: string
        })
      }
    }
  },
  async (req, res) => {
    const { id } = req.params;
    openTelemetryCollector.debug('Scrubbing claim', { id });
    const result = await serviceFactory().scrubClaim(id);
    res.status(200).json({
      status: result.status,
      denials: result.denials.map((denial) => ({
        carcCode: denial.carcCode,
        category: denial.category
      }))
    });
  }
);
