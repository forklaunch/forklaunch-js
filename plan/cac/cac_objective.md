# CAC Module — Objective

**What this is:** a one-page summary of *why* the `cac-base` module exists and *how* it works, for anyone who wants the shape of it without reading the full implementation plan. For entity schemas, the CLI wiring checklist, phasing, PR breakdown, and sourced domain research, see [MEDICAL-CODING-IMPLEMENTATION-PLAN.md](MEDICAL-CODING-IMPLEMENTATION-PLAN.md).

## What we're trying to achieve

Build the coding/billing engine for a hospital claims platform — the piece that takes a patient encounter (diagnoses + procedures), checks it's billable and error-free, and gets it ready to submit to a payer for reimbursement.

We're building it as a reusable ForkLaunch module (`cac-base`), the same way `iam-base` and `billing-base` are — **not** a product ForkLaunch operates or sells directly to hospitals. Confirmed by the founder: ForkLaunch is not in the CPT-licensing business. Companies who already hold their own AMA CPT license use `cac-base` as a building block, build their own product on top of it, and self-host it — modifying and extending it as their own needs require.

## How it works, end to end

1. **A claim gets built.** An encounter (visit) has diagnoses (ICD-10 codes, free/public) and procedures (CPT codes). Out of the box the module uses free mock procedure-code placeholders, since ForkLaunch never holds real CPT content — an adopter with their own license plugs in their own real CPT connector. These combine into a claim.

2. **The claim gets "scrubbed" before it's sent anywhere** — three separate correctness checks:
   - *Do these two procedures conflict* (NCCI PTP)
   - *Is the quantity billed plausible* (NCCI MUE — e.g. not "5 appendectomies")
   - *Does the diagnosis actually justify the procedure* (LCD/NCD — the real medical-necessity check)

   Bad claims get flagged with the same denial codes real payers use (CO-11, CO-16, CO-27, CO-50, CO-97), before they ever leave the building.

3. **Clean claims go out and remittances come back.** We check the patient's coverage first (270/271 eligibility), submit the claim (837) through a clearinghouse (Stedi), and parse the payment/denial response (835) when it comes back — feeding a worklist so staff can see and fix what got denied.

4. **The mock-vs-real switch — and who's on each side of it.** There's one interface (`CodeSetProvider`) with two sides: a free, fully-built mock implementation that ships with the module, and a real-CPT extension point that an adopting company implements themselves, against their own licensed CPT data. ForkLaunch builds and tests the extension point itself (so it's genuinely usable on day one, not a future promise) but never fills it with real AMA content — that's each adopter's own connector, using their own license. A single per-organization flag decides which side is active; nothing else in the claim/scrubbing logic changes when it flips.

5. **It's a module, not a one-off app.** It plugs into ForkLaunch's existing pieces — IAM for who's allowed to do what (coders vs. billers), the compliance layer for encrypting patient data and audit logs automatically, tenant isolation so one hospital never sees another's data — the same way the `billing` and `iam` modules already do.

## Business model, in plain terms

ForkLaunch never applies for, holds, or pays for a CPT license — not for ourselves, and not on behalf of anyone using the module. Each company building on `cac-base` is expected to already have (or independently obtain) their own AMA CPT license before wiring up real CPT data, exactly the way they'd bring their own Stripe account to `billing-base` or their own auth policy to `iam-base`. No patient or doctor data ever flows through ForkLaunch — every adopter deploys and runs their own instance, under their own license, on their own infrastructure.

## Validating it without a license

Since ForkLaunch never touches real CPT, validation focuses entirely on the free code sets (ICD-10-CM, HCPCS, and the three-layer scrubbing engine above) — no license needed. A simple UI for exactly this is planned as a separate build in the `forklaunch-platform` repo: enter a diagnosis code, a mock procedure code, and a unit count; see whether the claim passes or gets flagged, and which layer/denial code caught it. See the full plan, §10.

## Naming note

Named `cac` (Computer-Assisted Coding — the recognized health-information-management industry term), confirmed by the founder. One open item worth a quick confirmation: industry-wide, "CAC" specifically implies NLP-suggested codes from clinical documentation, which isn't this plan's current scope (the scrubbing engine validates codes already entered, it doesn't suggest them from text). See the full plan, §12 item 9.
