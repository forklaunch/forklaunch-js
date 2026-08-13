# Medical Coding / Billing Platform — Implementation Plan

**Status:** Draft for review
**Owner:** Engineering
**Based on:** `implementation_plan_free_first.docx` (v2.0, Free-First Strategy) and `ama_cpt_license_timeline.pdf`, reconciled against the current ForkLaunch codebase (`hasPermissionChecks` branch).

---

## 1. Decision: how this gets built

Two ways to build this were considered:

| Option | What it means | Verdict |
|---|---|---|
| **A. App-level service** | A new service inside our own application, built with `forklaunch init service`, that *follows the same architectural pattern* as `blueprint/billing-base` / `blueprint/iam-base` (compliance-classified entities, RBAC, tenant isolation, mappers, SDK) but is **not** registered as a reusable module in the ForkLaunch CLI. | **Chosen** |
| B. First-class framework module | Add `Module::MedicalCoding` to the Rust CLI (`cli/src/constants.rs` and ~12 other files that exhaustively pattern-match on `Module`), plus new `blueprint/interfaces/medical-coding` and `blueprint/implementations/medical-coding/*` packages, so any ForkLaunch user could run `forklaunch init module -m medical-coding-base`. | Deferred — much larger lift, only worth it if we intend to ship this as a public framework offering the way `billing-base`/`iam-base` are. Revisit after Option A proves the domain model in production. |

Everything below assumes **Option A**. We reuse every framework primitive that `billing-base`/`iam-base` use (compliance entities, encryption, tenant isolation, RBAC guards, audit logging, retention) — we just don't touch the CLI's Rust internals.

---

## 2. Strategic context (why free-first)

From the reference doc: we have no paying hospital clients yet. CPT (procedure) codes are owned by the AMA and require a **paid commercial license** — everything else needed to run a real billing pipeline is free and government-published:

| Component | Source | Cost | Build now? |
|---|---|---|---|
| ICD-10-CM (diagnosis codes) | CMS/CDC | Free | Yes |
| HCPCS Level II (supplies/drugs/equipment) | CMS | Free | Yes |
| NCCI edits (code-conflict rules) | CMS | Free | Yes |
| CARC/RARC (denial reason codes) | X12 | Free to view | Yes |
| Eligibility / claim status (270/271) | Clearinghouse API | Per-transaction fee | Yes |
| **CPT (procedure codes)** | **AMA** | **Paid license** | **Defer until a hospital confirms as paying client** |

**Trigger to license CPT:** the moment a real hospital/clinic is confirmed as a paying client and will run real CPT-coded claims. Not before. Until then, the platform is built, tested, and demoed using ICD-10 + HCPCS + **mock procedure codes** that carry the same shape/behavior as CPT without using AMA's actual code list.

### AMA licensing timeline (once triggered)

| Step | What happens | Time |
|---|---|---|
| 1. Apply | Submit CPT distributor license application at ama-assn.org | Same day |
| 2. AMA reaches out | Licensing specialist schedules a call | Within 10 business days |
| 3. Discovery call | Discuss product, user count, distribution model | 1–2 weeks after step 2 |
| 4. Quote & contract | AMA sends pricing + license agreement | 1–2 weeks |
| 5. Signed & active | Legally allowed to use real CPT codes commercially | — |

**Total: ~4–6 weeks.** Application requires: legal company info, a product description (what the platform does & how CPT is used), technical details (how CPT data is stored/secured), scale info (# hospitals/users, SaaS model), and an **AI/LLM disclosure** if applicable. Because of the lead time, Phase 6 (licensing) must start **4–6 weeks before** the target go-live date for the first paying client — it should never be the thing blocking go-live.

---

## 3. Target architecture (mirrors `billing-base` / `iam-base`)

New service: **`medical-coding-base`** (working name), placed alongside our other application services, using the exact structural pattern already established:

```
medical-coding-base/
├── api/
│   ├── controllers/        # patient, encounter, claim, eligibility, remittance, codeSet controllers
│   └── routes/
├── domain/
│   ├── enum/                # ClaimStatus, DenialReasonCategory, CodeSetType, LicenseStatus...
│   ├── mappers/              # request/response <-> entity mapping (mirrors billing's *.mappers.ts)
│   ├── schemas/
│   └── types/
├── persistence/
│   ├── entities/             # see §4 — all built with defineComplianceEntity()
│   ├── seeders/              # synthetic/mock trial dataset (Phase 0 task, already started)
│   └── seed.data.ts
├── bootstrapper.ts            # DI container, mirrors billing-base's provider-swap pattern
├── registrations.ts
├── sdk.ts
├── server.ts
├── mikro-orm.config.ts
└── scripts/enforce-retention.ts   # reuse framework's RetentionService, same as billing/iam
```

This is not a new pattern to invent — it's copy-the-shape from `blueprint/billing-base`, most directly its **provider abstraction**: `billing-base` defines a `BillingProviderEnum` and a swappable provider interface (`blueprint/interfaces/billing/interfaces/*.service.interface.ts`) so Stripe can be swapped in later without rewriting the app. We do the same thing for code sets (§5).

### Multi-tenancy: hospital = Organization

The framework already has organization-scoped tenant isolation (`framework/core/src/persistence/tenantFilter.ts`, `rls.ts`) and it's used today in `iam-base` (`Organization` entity, `organizationId` on JWT session). We reuse this directly:

- Each hospital/clinic client == one `Organization` (from the existing IAM service).
- Every medical-coding entity carries an `organizationId` (tenant) field, exactly like `iam-base`'s pattern of scoping `User` queries by `organization.id` in `blueprint/iam-base/api/controllers/user.controller.ts`.
- Cross-service calls to IAM for auth/roles use the same JWT + `decodeResourceWithOrganizationId` pattern already implemented there.

### RBAC: coders, billers, admins

Reuse IAM's `Role`/`Permission` entities and the existing permission-guard machinery (`framework/core/src/http/guards/hasPermissionChecks.ts`, wired into `auth.middleware.ts` on this very branch). Routes declare `allowedPermissions` / `allowedRoles` exactly like `iam-base`'s controllers do today, e.g.:

- `coder:submit_claim`, `biller:view_remittance`, `admin:manage_codesets`, `auditor:read_only`.
- PHI-bearing read endpoints (patient demographics, claim detail) get stricter `allowedPermissions` than aggregate/analytics endpoints.

---

## 4. Data model (Phase 1 schema, compliance-classified)

Every entity uses `defineComplianceEntity()` (`framework/core/src/persistence/defineComplianceEntity.ts`), which **forces** every scalar field to declare `.compliance('pii' | 'phi' | 'pci' | 'none')` at the type level — the entity won't compile otherwise. `phi`/`pci` fields are automatically eligible for the framework's `FieldEncryptor` (AES-256-GCM, per-tenant HKDF-derived keys — `framework/core/src/persistence/fieldEncryptor.ts`).

| Entity | Key fields | Compliance notes |
|---|---|---|
| `Patient` | name, DOB, SSN/MRN, address, contact | `phi` on name/DOB/SSN/contact — encrypted at rest |
| `Insurance` | payer, member ID, group number | `phi` on member ID |
| `Encounter` (visit) | patient, provider, date, org | `phi` via relation; scalar fields mostly `none` |
| `Diagnosis` | ICD-10 code, encounter link | `none` — code itself is public data |
| `Charge` | procedure code (real CPT or mock placeholder), amount, encounter | `none`, gated by license (see §5) |
| `Claim` | charges[], diagnoses[], status, payer | `phi` by relation to Patient |
| `Remittance` (ERA/835) | claim, paid amount, CARC/RARC codes | `none` |
| `Denial` | claim, reason code, worklist status | `none` |
| `CodeSetLicense` | org, codeSetType (`cpt`), status (`none`/`pending`/`active`), signedAt | drives feature gate, see §5 |
| `AuditLog` | actor, action, entity, timestamp | uses framework's existing `auditLogger.ts` — every PHI read/write |

All entities get a `retention` policy via the same mechanism `RetentionService` (`framework/core/src/services/retentionService.ts`) already enforces for billing/iam — e.g. denial worklist records anonymized after N years per HIPAA §164.530(j), enforced by `scripts/enforce-retention.ts` exactly as the other modules do.

---

## 5. Code-set provider abstraction & CPT license gating

This is the mechanism that makes "free-first, swap later" actually safe and mechanical rather than a manual migration.

**Pattern to copy:** `billing-base` already solves an almost identical problem — "the real provider (Stripe) costs money and isn't always configured, so build against an interface and swap the implementation." We do the same for procedure codes:

```
CodeSetProvider (interface)
 ├─ MockProcedureCodeProvider   — "PROC-001: Office Visit", built Phase 2, no license needed
 └─ CptCodeProvider             — real AMA CPT data, activated only after license signed
```

**License gate, reusing an existing framework guard — not a new primitive:** the framework already has `hasFeatureChecks` / `hasSubscriptionChecks` guards (`framework/core/src/http/guards/`, wired into `auth.middleware.ts`) that gate routes on `requiredFeatures` resolved per-request via a `surfaceFeatures(session, req)` callback — this is the exact mechanism billing uses for entitlement-gated features. We model **"real CPT codes active"** as a feature flag surfaced from the `CodeSetLicense` entity:

- Before license is signed: `surfaceFeatures` never returns `cpt-licensed`, so any route/behavior requiring real CPT falls back to `MockProcedureCodeProvider`. No code branches on "did we license yet" scattered through business logic — it's the same declarative `allowedPermissions`/`requiredFeatures` shape already used everywhere else in the codebase.
- After license is signed and `CodeSetLicense.status = 'active'`: `surfaceFeatures` returns `cpt-licensed` for that organization, `CptCodeProvider` is used, same scrubbing/claim logic runs unchanged (this is the whole point of Phase 2's placeholder-code design in the source doc — "swapped for real CPT data later with no rework").

This also gives us a clean **per-hospital** cutover: a multi-hospital SaaS platform can have some organizations still on mock codes and others already licensed, with zero risk of one tenant's licensing status leaking into another (enforced by the same tenant-isolation filter used everywhere else).

---

## 6. Compliance / HIPAA posture

We are not starting from zero — `COMPLIANCE_COVERAGE.md` shows the framework already addresses 34/43 cross-standard (HIPAA/SOC2/PCI/GDPR) requirements at the framework layer, including the exact things a PHI-handling service needs:

- Field-level data classification + PHI encryption at rest (`compliance()` + `FieldEncryptor`)
- Tenant isolation (application + infra)
- Access control + audit logging (application + infra)
- Automatic session logoff, right to erasure, data portability, data retention/disposal

Confirmed by direct code inspection (`framework/core/src/persistence/defineComplianceEntity.ts`, `complianceTypes.ts`) and by `COMPLIANCE_GAPS_PLAN.md`'s own framing — every remaining gap is "no new framework primitives needed," meaning the compliance layer is intentionally module-agnostic. Concretely, for free, with zero extra code in `medical-coding-base`:

- Any entity field marked `.compliance('phi')` on a `defineComplianceEntity()` is **auto-encrypted** (AES-256-GCM, per-tenant HKDF-derived key) via `EncryptedType`/`FieldEncryptor` — the entity won't even compile if a scalar field skips classification.
- `forklaunch init service`'s generic router template already generates a `compliance.controller.ts` exposing `DELETE /erase/:userId` and `GET /export/:userId` (HMAC-protected, internal-only), backed by `ComplianceDataService` — this walks all PHI/PII/PCI-classified entities automatically. We get GDPR-style per-patient erase/export for free, not just for staff `User` records.
- `scripts/enforce-retention.ts` + `RetentionService` batches delete/anonymize per entity's `retention` policy — same generic mechanism `billing-base`/`iam-base` already use, no new code path for medical-coding.
- Tenant isolation (`tenantFilter.ts` + `rls.ts`) activates automatically for any entity with an `organizationId`/`organization` relation — nothing to register.

Gaps called out in `COMPLIANCE_GAPS_PLAN.md` (consent management, pen testing, DR testing) are framework/CLI-level and orthogonal to this service — no new work required here beyond using what exists correctly. The **new** thing this service needs that doesn't exist yet is the `CodeSetLicense` entity/feature-gate itself (§5) — everything else is reuse.

Before any real hospital data touches the system (source doc's Phase 4 item): run an external security review, same as any other PHI-bearing service on this stack.

---

## 7. Phased delivery plan

Directly adopting the source doc's phases, mapped onto concrete engineering work in *this* codebase:

| Phase | Focus | CPT needed? | Concrete engineering tasks |
|---|---|---|---|
| **0** (Wk 1–4) | Foundations | No | Clearinghouse sandbox (Stedi/Claim.MD/Availity) credentials; confirm HIPAA-ready hosting + BAA; scaffold `medical-coding-base` service skeleton (`forklaunch init service`); synthetic test dataset (already started per source doc) |
| **1** (Wk 3–6) | Code validation | No | ICD-10-CM loader (download→parse→store→validate) — prototype exists per source doc; extend same pattern to HCPCS Level II; define all entities in §4 with `defineComplianceEntity` |
| **2** (Wk 6–10) | Claim engine & scrubbing, mock codes | No — placeholders | `MockProcedureCodeProvider`; claim builder (encounter+charges+diagnoses→claim); scrubbing rules: required fields, diagnosis–procedure necessity (mock codes, proves CO-11 logic), NCCI code-pair conflicts (ICD-10 side); clearinghouse sandbox submission end-to-end |
| **3** (Wk 10–14) | Eligibility & remittance | No | EDI 270/271 eligibility check at intake (blocks CO-27 denials); ERA/835 remittance parsing, auto-post + CARC/RARC capture; denial worklist UI |
| **4** (Wk 14–16) | Analytics & compliance hardening | No | Clean-claim-rate / denial-rate / days-in-A/R dashboard; confirm RBAC + audit logging on every PHI path (reuse existing guards, don't reinvent); external security review |
| **5** (Mo 4–6) | Sales demos | No — mock codes | Demo to small clinics/billing companies (shorter sales cycle than hospitals); use CO-27/CO-16 denial examples as live proof points; be transparent that CO-11/real-CPT activates post-licensing |
| **6** (Trigger-based) | CPT licensing & go-live | **Yes** | On trigger (hospital confirms paying): contact AMA immediately (§2 timeline); file license 4–6 weeks before go-live target; once signed — implement `CptCodeProvider`, flip `CodeSetLicense.status='active'` for that org, re-run QA on medical-necessity scrubbing against real CPT+ICD-10 pairs before first real claim |

**Do not start Phase 6 on a calendar** — it's trigger-based off a real signed/verbally-confirmed paying client, run in parallel with that client's onboarding, per the source doc.

---

## 8. Success metrics (from source doc's trial-data baseline)

| Metric | Trial baseline | Target |
|---|---|---|
| Clean claim rate | 60% | 95%+ |
| Denial rate | 30% | Under 5% |
| Average days to payment | 24 days | Under 40 days (already met) |

---

## 9. Open questions

1. **Provider abstraction naming/location** — does this live inside `medical-coding-base` itself, or do we want a shared `codeSet` interfaces package under our own product's libraries (analogous to `blueprint/interfaces/billing`) in case we build more than one service against it later?
2. **IAM cross-service integration** — does the hospital's staff (coders/billers) get provisioned in the *existing* `iam-base` service as `User`s with new `Role`s, or does this need its own lightweight staff directory? (Recommend: existing IAM — avoids duplicating auth.)
3. **Clearinghouse choice** — Stedi vs Claim.MD vs Availity for the sandbox (Phase 0 first task) — needs a decision before Phase 0 can start.
4. **CO-11 demo honesty** — Phase 5 demos must clearly disclose to prospects that diagnosis–procedure necessity checks run against mock codes pre-license; confirm sales is aligned on this messaging.

## 10. Immediate next steps

1. Create clearinghouse sandbox account (free) and request API credentials.
2. Finalize the `medical-coding-base` entity schema (§4) and confirm HIPAA-ready hosting/BAA.
3. Extend the existing ICD-10 loader to HCPCS using the same pattern.
4. Build the scrubbing rules engine against `MockProcedureCodeProvider`.
5. Begin outreach to small clinics/billing companies for early demos — no license required yet.
6. Only after a paying client is confirmed: contact AMA and start the CPT licensing process (§2).

---

## Appendix: what "framework module" (Option B) would require, if revisited later

Not part of the current plan — kept here so the research isn't lost if we ever decide to ship this as a public, reusable ForkLaunch module the way `billing-base`/`iam-base` are.

The CLI (`cli/`) is a Rust binary. `billing`/`iam` are deeply, exhaustively hardcoded through it — this is not a config-driven plugin system. Adding `Module::MedicalCodingBase` would touch:

- **`cli/src/constants.rs`** — new `Module` enum variant + match arms in `get_service_module_name/description/cache()`.
- **`cli/src/core/modules.rs`** — new `MedicalCodingConfig` variant, extend `ModuleConfig`/`validate_modules()` exclusivity logic.
- **`cli/src/core/template.rs`** — new match arm in `get_routers_from_standard_package()` listing this module's sub-routers.
- **`cli/src/core/manifest/service.rs`** + `init/module.rs` + `init/application.rs` — new `is_medical_coding`/`is_medical_coding_configured` boolean flags, threaded through the same places `is_iam`/`is_billing` are today.
- **`cli/src/core/package_json/project_package_json.rs`** + `package_json_constants.rs` — new dependency fields + version constants for `@forklaunch/interfaces-medical-coding` / `@forklaunch/implementation-medical-coding-base`.
- **Three new blueprint layers**, mirroring iam/billing exactly:
  - `blueprint/interfaces/medical-coding` — pure contract package (service interfaces + types, no implementation).
  - `blueprint/implementations/medical-coding/base` (+ alternate implementations later, e.g. a different coding engine) — concrete service classes implementing the interfaces.
  - `blueprint/medical-coding-base` — the living reference app (entities, controllers, DI wiring) that Layer A depends on.
- **Git symlinks** — `cli/src/templates/project/medical-coding-base/*` would need to be literal symlinks into `blueprint/medical-coding-base/*` (this is how `billing-base`/`iam-base` templates work today — the "template" *is* the blueprint app, with `@forklaunch/blueprint-*` import prefixes mustache-rewritten to the generated app's scope at generation time).
- **`docs/adding-projects/modules.md`** — add a row to the module table.
- **New CLI shell tests** — `cli/tests/init_medical_coding.sh`, following `init_module.sh`/`init_billing_stripe.sh`.

Notably, **`framework/core`, `framework/express`, `framework/common` need zero changes** for either option — a grep across the framework for `iam`/`billing` turns up essentially nothing; RBAC, tenant isolation, compliance/encryption, and retention are already fully generic and module-agnostic (see §6). The entire Option B lift is CLI scaffolding + new blueprint packages, not framework work. There is also currently no doc describing "how to add a new module type to the framework itself" (`docs/adding-projects/modules.md` only covers consuming existing modules) — if Option B is pursued, that doc gap should be filled as part of the work.
