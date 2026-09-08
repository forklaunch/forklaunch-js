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
// (RBAC verification pass, §14 PR 5).
//
// sessionSchema + explicit organizationId passed into every service call —
// NOT "tenant scoping stays automatic," which this comment used to claim.
// The framework's own MikroORM tenant filter fails OPEN when no tenant
// context is set (its own source comment: "safe: tenant-scoped endpoints
// always set filter params before querying" — which nothing here was
// doing), and no service method filtered by organizationId itself either.
// Found via the e2e suite: a valid token for one organization could read
// and resolve another organization's claims/denials. See
// plan/cac/MEDICAL-CODING-IMPLEMENTATION-PLAN.md §12 for the writeup.
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
      sessionSchema: {
        organizationId: string
      },
      allowedPermissions: MANAGE_CLAIMS_PERMISSIONS
    },
    body: {
      encounterId: string
    },
    responses: {
      200: {
        id: string,
        status: string,
        codeSetType: string
      }
    }
  },
  async (req, res) => {
    const { encounterId } = req.body;
    const organizationId = req.session?.organizationId;
    openTelemetryCollector.debug('Building claim', { encounterId });
    const claim = await serviceFactory().buildClaim(organizationId, encounterId);
    res
      .status(200)
      .json({ id: claim.id, status: claim.status, codeSetType: claim.codeSetType });
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
      sessionSchema: {
        organizationId: string
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
    const organizationId = req.session?.organizationId;
    openTelemetryCollector.debug('Scrubbing claim', { id });
    const result = await serviceFactory().scrubClaim(organizationId, id);
    res.status(200).json({
      status: result.status,
      denials: result.denials.map((denial) => ({
        carcCode: denial.carcCode,
        category: denial.category
      }))
    });
  }
);
