import {
  handlers,
  schemaValidator,
  string
} from '@forklaunch/blueprint-core';
import { ci, tokens } from '../../bootstrapper';

const openTelemetryCollector = ci.resolve(tokens.OtelCollector);
const serviceFactory = ci.scopedResolver(tokens.ClaimService);
const JWKS_PUBLIC_KEY_URL = ci.resolve(tokens.JWKS_PUBLIC_KEY_URL);

// coder:manage_claims — not coder:submit_claim as originally sketched in
// plan §3: cac-base never submits a claim anywhere (§8, §14), so a
// "submit" permission would promise something these routes don't do.
// Covers both building and scrubbing a claim; a real IAM deployment seeds
// this slug the same way it seeds its own platform:read/platform:write
// permissions (§3 "Migrations").
const MANAGE_CLAIMS_PERMISSIONS = new Set(['coder:manage_claims']);

// Claim engine + three-layer scrubbing (§6) — mock codes only, per Phase 2 /
// PR 3 scope (plan/cac/MEDICAL-CODING-IMPLEMENTATION-PLAN.md §10, §14).
// Protected + JWT, not internal/HMAC — these are the actual coder-facing
// actions a real adopter's front-end calls on behalf of a logged-in coder
// (RBAC verification pass, §14 PR 5; matches the pattern
// billing-base/billingPortal.controller.ts already uses for its own
// non-IAM-owning protected routes — no custom session/decodeResource
// wiring needed, tenant scoping stays automatic per §9).
export const buildClaim = handlers.post(
  schemaValidator,
  '/build',
  {
    name: 'Build Claim',
    access: 'protected',
    summary:
      "Builds a claim from an encounter's charges and diagnoses",
    auth: {
      jwt: {
        jwksPublicKeyUrl: JWKS_PUBLIC_KEY_URL
      },
      allowedPermissions: MANAGE_CLAIMS_PERMISSIONS
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
    access: 'protected',
    summary:
      'Runs a claim through the NCCI PTP / NCCI MUE / LCD-NCD scrubbing engine',
    auth: {
      jwt: {
        jwksPublicKeyUrl: JWKS_PUBLIC_KEY_URL
      },
      allowedPermissions: MANAGE_CLAIMS_PERMISSIONS
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
