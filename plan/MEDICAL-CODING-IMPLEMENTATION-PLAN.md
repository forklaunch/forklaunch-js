# Medical Coding / Billing Platform — Implementation Plan

**Status:** Draft for review
**Owner:** Engineering
**Based on:** `implementation_plan_free_first.docx` (v2.0, Free-First Strategy) and `ama_cpt_license_timeline.pdf`, reconciled against the current ForkLaunch codebase, deepened with a second codebase pass and external research into medical-coding domain standards (CMS, AMA, X12, MGMA/HFMA — see §14 Sources).

---

## 1. Decision: how this gets built

Two ways to build this were considered:

| Option | What it means | Verdict |
|---|---|---|
| **A. App-level service** | A new service inside our own application, built with `forklaunch init service`, that *follows the same architectural pattern* as `blueprint/billing-base` / `blueprint/iam-base` (compliance-classified entities, RBAC, tenant isolation, mappers, SDK) but is **not** registered as a reusable module in the ForkLaunch CLI. | **Chosen** |
| B. First-class framework module | Add `Module::MedicalCoding` to the Rust CLI (`cli/src/constants.rs` and ~12 other files that exhaustively pattern-match on `Module`), plus new `blueprint/interfaces/medical-coding` and `blueprint/implementations/medical-coding/*` packages, so any ForkLaunch user could run `forklaunch init module -m medical-coding-base`. | Deferred — much larger lift, only worth it if we intend to ship this as a public framework offering the way `billing-base`/`iam-base` are. Revisit after Option A proves the domain model in production. See Appendix. |

Everything below assumes **Option A**. We reuse every framework primitive that `billing-base`/`iam-base` use (compliance entities, encryption, tenant isolation, RBAC guards, audit logging, retention) — we just don't touch the CLI's Rust internals.

---

## 2. Strategic context (why free-first)

From the reference doc: we have no paying hospital clients yet. CPT (procedure) codes are owned by the AMA and require a **paid commercial license** — everything else needed to run a real billing pipeline is free and government-published:

| Component | Source | Cost | Build now? |
|---|---|---|---|
| ICD-10-CM (diagnosis codes) | CDC/NCHS + CMS | Free | Yes |
| HCPCS Level II (supplies/drugs/equipment) | CMS | Free | Yes |
| NCCI PTP + MUE edit tables (code-conflict rules) | CMS | Free | Yes |
| LCD/NCD (diagnosis-procedure medical necessity) | CMS (per-MAC) | Free | Yes |
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

**Total: ~4–6 weeks.** Because of the lead time, Phase 6 (licensing) must start **4–6 weeks before** the target go-live date for the first paying client — it should never be the thing blocking go-live.

### License type and pricing (researched — refines the source PDF)

The AMA distinguishes two license categories: an **end-user/limited license** (for organizations *using* CPT internally, e.g. a single hospital's own EHR) and a **distributor license** (for a company embedding CPT content into a product it distributes/sells to others). A multi-hospital SaaS billing platform needs the **distributor license**, and — importantly — **a separate license is required per product** that contains CPT content, not one blanket company-wide license.

Pricing is royalty-based and varies by product/user type rather than a single published rate card. Publicly reported reference points (vendor-reported, not an official AMA rate card — confirm exact numbers with an AMA licensing specialist on the discovery call):
- Roughly **$18–20 per clinician/user per year** for EHR/practice-management platforms.
- **~$0.24 per health-plan member per year** for payer-side use, with a **$100/year minimum royalty** on health-plan-model licenses.
- At least one reported vendor arrangement combining a flat annual royalty (~$1,050/yr) with a separate annual tooling fee (~$13,000/yr for "CPT Link" integration).

**Application inputs still required (unchanged from the source PDF):** legal company info, a product description (what the platform does & how CPT is used), technical details (how CPT data is stored/secured), scale info (# hospitals/users, SaaS model), and an **AI/LLM disclosure** if applicable — expect the per-clinician/per-provider-seat model to be the default the specialist proposes for a SaaS platform, and budget accordingly per hospital rather than as one fixed fee.

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
│   ├── migrations/           # hand-written DDL, see "Migrations" below
│   ├── seeders/              # small reference/config data only — NOT full code-set files, see §7
│   └── seed.data.ts
├── bootstrapper.ts            # DI container, mirrors billing-base's provider-swap pattern
├── registrations.ts
├── sdk.ts
├── server.ts
├── mikro-orm.config.ts
└── scripts/
    ├── enforce-retention.ts   # reuse framework's RetentionService, same as billing/iam
    └── refresh-code-sets.ts   # NEW — see §7, follows the enforce-retention.ts pattern exactly
```

This is not a new pattern to invent — it's copy-the-shape from `blueprint/billing-base`, most directly its **provider abstraction**: `billing-base` defines a `BillingProviderEnum` and a swappable provider interface (`blueprint/interfaces/billing/interfaces/*.service.interface.ts`) so Stripe can be swapped in later without rewriting the app. We do the same thing for code sets (§5).

### Multi-tenancy: hospital = Organization

The framework already has organization-scoped tenant isolation (`framework/core/src/persistence/tenantFilter.ts`, `rls.ts`) and it's used today in `iam-base` (`Organization` entity, `organizationId` on JWT session). We reuse this directly:

- Each hospital/clinic client == one `Organization` (from the existing IAM service).
- Every medical-coding entity carries an `organizationId` (tenant) field, exactly like `iam-base`'s pattern of scoping `User` queries by `organization.id` in `blueprint/iam-base/api/controllers/user.controller.ts`.

### RBAC: coders, billers, admins

Reuse IAM's `Role`/`Permission` entities and the existing permission-guard machinery (`framework/core/src/http/guards/hasPermissionChecks.ts`, wired into `auth.middleware.ts` on this very branch). Routes declare `allowedPermissions` / `allowedRoles` exactly like `iam-base`'s controllers do today, e.g.:

- `coder:submit_claim`, `biller:view_remittance`, `admin:manage_codesets`, `auditor:read_only`.
- PHI-bearing read endpoints (patient demographics, claim detail) get stricter `allowedPermissions` than aggregate/analytics endpoints.

### Cross-service calls to IAM (concrete mechanism, confirmed by codebase inspection)

Two distinct SDK layers exist in this codebase and it's easy to reach for the wrong one:

- `blueprint/client-sdk` is explicitly for **external** consumers (dashboards, third-party integrations) — its own comment states internal services should **not** use it.
- For service-to-service calls, the actual pattern (see `blueprint/iam-base/surfacing.ts`) is: cache a typed client via `universalSdk<IamSdkClient>({ host: iamUrl, registryOptions: { path: 'api/v1/openapi' } })` (from `framework/universal-sdk`, which fetches the target service's OpenAPI spec and builds a typed client on the fly), then call e.g. `iamSdk.user.surfacePermissions({ params: { id }, headers: generateHmacAuthHeaders(...) })`.

`medical-coding-base` will call IAM the same way — cache a `universalSdk<IamSdkClient>` instance in `registrations.ts`, and reuse it wherever a coder/biller's roles or permissions need to be surfaced, mirroring `createSurfacePermissions`/`createSurfaceRoles` in `surfacing.ts` almost verbatim rather than inventing a new integration style.

### Migrations (confirmed pattern)

`iam-base`'s migrations (`Migration00000000000000.ts`, `Migration00000000000001.ts`) are **hand-written DDL**, sequentially zero-padded, with migration 0 = schema and migration 1 = static seed data (permissions/roles), each with a matching reversible `down()`. `medical-coding-base` follows the same convention — small, versioned reference tables (e.g. an initial `CodeSetType` lookup) belong in a migration exactly like IAM's permission/role seed; the *bulk* ICD-10/HCPCS code tables do not (see §7 — that's an ETL job, not a migration).

---

## 4. Data model (Phase 1 schema, compliance-classified)

Every entity uses `defineComplianceEntity()` (`framework/core/src/persistence/defineComplianceEntity.ts`), which **forces** every scalar field to declare `.compliance('pii' | 'phi' | 'pci' | 'none')` at the type level — the entity won't compile otherwise. `phi`/`pci` fields are automatically eligible for the framework's `FieldEncryptor` (AES-256-GCM, per-tenant HKDF-derived keys — `framework/core/src/persistence/fieldEncryptor.ts`).

| Entity | Key fields | Compliance notes |
|---|---|---|
| `Patient` | surrogate ID (internal UUID/MRN), name, DOB, address, contact; SSN **only if a payer requires it for eligibility** | `phi` on name/DOB/contact/SSN — encrypted at rest. See "SSN" note below. |
| `Insurance` | payer, member ID, group number | `phi` on member ID |
| `Encounter` (visit) | patient, provider, date, org | `phi` via relation; scalar fields mostly `none` |
| `Diagnosis` | ICD-10-CM code, encounter link | `none` — code itself is public data |
| `Charge` | procedure code (real CPT or mock placeholder), units, amount, encounter | `none`, gated by license (see §5); `units` matters for MUE checks (§6) |
| `Claim` | charges[], diagnoses[], status, payer | `phi` by relation to Patient |
| `Remittance` (ERA/835) | claim, paid amount, CARC/RARC codes | `none` |
| `Denial` | claim, CARC/RARC reason code, worklist status | `none` |
| `CodeSetLicense` | org, codeSetType (`cpt`), status (`none`/`pending`/`active`), signedAt | drives feature gate, see §5 |
| `AuditLog` | actor, action, entity, timestamp | uses framework's existing `auditLogger.ts` — every PHI read/write |

**On SSN specifically:** storing a raw SSN maximizes PHI blast radius for minimal benefit — most billing workflows only need it for payer eligibility verification, not as a primary key. Recommendation: use an internal surrogate identifier (UUID or MRN) as `Patient`'s reference everywhere in the domain model, and store SSN only in the fields a specific payer integration actually requires, still `phi`-classified and encrypted. This is a direct application of HIPAA's "minimum necessary" principle, not just an encryption checkbox.

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

- Before license is signed: `surfaceFeatures` never returns `cpt-licensed`, so any route/behavior requiring real CPT falls back to `MockProcedureCodeProvider`.
- After license is signed and `CodeSetLicense.status = 'active'`: `surfaceFeatures` returns `cpt-licensed` for that organization, `CptCodeProvider` is used, same scrubbing/claim logic runs unchanged.

This also gives a clean **per-hospital** cutover: some organizations can stay on mock codes while others are already licensed, with zero risk of one tenant's licensing status leaking into another (enforced by the same tenant-isolation filter used everywhere else).

**Historical claims are never retroactively recoded.** When an organization's `CodeSetLicense` flips to `active`, only *new* encounters created afterward use `CptCodeProvider`. Claims already built and submitted under `MockProcedureCodeProvider` remain exactly as they were coded — a submitted claim is a financial/legal record, and retroactively changing its procedure codes after the fact would itself be a compliance problem. This should be stated explicitly to any pilot client during Phase 5 demos (see §12).

---

## 6. Claim scrubbing engine — three distinct rule layers

The source doc's phase plan referred to a single, vaguely-named "diagnosis-procedure necessity check" and "NCCI code-pair conflicts (ICD-10 side)." Research corrected this: **NCCI and medical-necessity checking are two unrelated mechanisms with different data sources**, and the original wording conflated them. The scrubbing engine needs three separate rule layers:

| Layer | What it checks | Code pairs involved | Data source | Update cadence | Typical denial if missed |
|---|---|---|---|---|---|
| **NCCI PTP** (Procedure-to-Procedure) | Two procedures billed together that shouldn't be, absent a justifying modifier | CPT/HCPCS ↔ CPT/HCPCS only — **never ICD-10** | CMS NCCI PTP edit tables | Quarterly | CO-97 ("benefit included in another service already adjudicated") |
| **NCCI MUE** (Medically Unlikely Edits) | Implausible unit count for a single code on one date of service (e.g. 5 appendectomies) | Single CPT/HCPCS code + units | CMS NCCI MUE tables | Quarterly | Line- or date-of-service-level unit denial |
| **LCD/NCD medical necessity** | Whether a diagnosis justifies a procedure at all | ICD-10-CM ↔ CPT/HCPCS — this *is* the real diagnosis-procedure crosswalk | CMS Medicare Coverage Database, per Medicare Administrative Contractor (MAC) — coverage is regional | Ongoing, MAC-specific | CO-50 ("not deemed a medical necessity") or CO-11 ("diagnosis is inconsistent with the procedure") |

Each mock procedure code built in Phase 2 needs a corresponding mock LCD-style mapping (which mock diagnoses justify which mock procedures) so the scrubbing logic and its test suite are exercising the real three-layer shape — not a placeholder single check — before real CPT data is swapped in.

### Reference: exact CARC definitions in use (confirmed against x12.org)

| Code | Definition | Layer it maps to |
|---|---|---|
| CO-11 | "The diagnosis is inconsistent with the procedure." | LCD/NCD medical necessity |
| CO-16 | "Claim/service lacks information or has submission/billing error(s)" (always paired with a RARC specifying what's missing) | Required-fields scrubbing |
| CO-27 | "Expenses incurred after coverage terminated." | Eligibility (270/271) |
| CO-50 | "These are non-covered services because this is not deemed a 'medical necessity' by the payer." | LCD/NCD medical necessity |
| CO-97 | "The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated." | NCCI PTP bundling |

---

## 7. Code-set lifecycle: update cadences and the refresh pipeline

Every code set this platform depends on has its own publisher and update cadence — the plan needs an explicit refresh mechanism, not just a one-time Phase-1 loader.

| Code set | Publisher | Cadence |
|---|---|---|
| ICD-10-CM | CDC/NCHS + CMS | Annual, effective **October 1** |
| HCPCS Level II | CMS | **Quarterly** (Jan/Apr/Jul/Oct) |
| CPT Category I | AMA | Annual, effective **January 1** (published previous fall) |
| CPT Category III | AMA | **Semiannual** (Jan/Jul) |
| NCCI PTP + MUE tables | CMS | **Quarterly** |
| CARC/RARC | X12 | **3×/year** (March, July, November) |

**Refresh mechanism — no framework-native cron exists (confirmed by codebase inspection):** `framework/implementations/worker/{bullmq,kafka,redis,database}` expose only `enqueueJob`/`enqueueBatchJobs`/`start` — no repeat/cron primitive is surfaced anywhere, even though BullMQ itself supports one internally. The one real precedent in this codebase is `scripts/enforce-retention.ts`, wired to a plain `"retention:enforce"` npm script that an external scheduler (k8s CronJob / cloud scheduler) invokes — there's no in-repo trigger. `medical-coding-base` should follow this exact convention: a `scripts/refresh-code-sets.ts` + `"codeset:refresh"` npm script, invoked externally on a schedule matched to the table above (the tightest cadence — HCPCS/NCCI quarterly — sets the polling interval).

**Bulk loading needs a dedicated ETL step, not the seeder pattern.** The existing `persistence/seeders/*.seeder.ts` + `seed.data.ts` pattern (e.g. `blueprint/billing-base/persistence/seeders/plan.seeder.ts`) is a thin wrapper that does one `em.create(...).flush()` per hand-written object literal — clearly sized for a handful of config rows, not the ~70,000 ICD-10-CM codes or ~7,000 HCPCS codes. `framework/infrastructure/S3`'s `S3ObjectStore` is closer but its `putBatchObjects` is just `Promise.all` over individual JSON puts, not a bulk-CSV loader either. `refresh-code-sets.ts` should instead: stream the government-published CSV/XML (staged in S3), parse it, and batch-insert via MikroORM in chunks (e.g. 1,000 rows per `em.persist(...).flush()`) — a purpose-built ETL script, following the *shape* of `enforce-retention.ts`'s batching loop (`framework/core/src/services/retentionService.ts` already batches at 1,000 records/flush for exactly this reason) but against a new code-set-specific service, not a reused generic primitive.

---

## 8. EDI transaction sets and clearinghouse choice

**Transaction sets needed** (confirmed standard for a hospital billing platform): **837** (claim submission — P/I/D variants), **835** (ERA/remittance), **270/271** (eligibility inquiry/response), **276/277** (claim status inquiry/response), **277CA** (claim acknowledgment — front-end edit summary on the 837), and **999** (functional acknowledgment, the 5010 replacement for 997). Given hospital utilization review needs, also plan for **278** (prior authorization/referral) even though the source doc didn't call it out.

**Version:** the HIPAA-mandated version remains **X12 005010** — a proposed 008020 update was declined by NCVHS in 2023, and while X12 has since published an 008060 guide as a forward candidate, nothing is mandated yet. Build against 5010 with **CAQH CORE operating-rule compliance** (e.g. its 835 Code Combinations rules, eligibility/claim-status response-time rules) as the near-term target — don't design for a version bump that hasn't been mandated.

**Clearinghouse decision (resolves the previously-open question):** **Stedi** for the primary sandbox/integration — it's the only clearinghouse of the three that's API-first, accepting/returning JSON rather than raw X12 for 837/270/271/276/277/835, with a permanently free sandbox and pure usage-based pricing (no monthly minimum). **Claim.MD** as a lower-cost secondary/fallback (REST+XML, ~$0.10–0.25/claim or ~$100/month unlimited) for redundancy. **Availity** deferred to a later phase — it has the broadest payer network but is architected EDI/portal-first with self-serve API access weaker than the other two; only worth the onboarding overhead once claim volume justifies its network breadth.

---

## 9. Compliance / HIPAA posture

We are not starting from zero — `COMPLIANCE_COVERAGE.md` shows the framework already addresses 34/43 cross-standard (HIPAA/SOC2/PCI/GDPR) requirements at the framework layer, including the exact things a PHI-handling service needs: field-level data classification + PHI encryption at rest, tenant isolation, access control + audit logging, automatic session logoff, right to erasure, data portability, and data retention/disposal.

Confirmed by direct code inspection and by `COMPLIANCE_GAPS_PLAN.md`'s own framing — every remaining framework gap is "no new framework primitives needed," meaning the compliance layer is intentionally module-agnostic. Concretely, for free, with zero extra code in `medical-coding-base`:

- Any entity field marked `.compliance('phi')` on a `defineComplianceEntity()` is **auto-encrypted** (AES-256-GCM, per-tenant HKDF-derived key) via `EncryptedType`/`FieldEncryptor`.
- `forklaunch init service`'s generic router template already generates a `compliance.controller.ts` exposing `DELETE /erase/:userId` and `GET /export/:userId` (HMAC-protected, internal-only), backed by `ComplianceDataService` — GDPR-style per-patient erase/export for free.
- `scripts/enforce-retention.ts` + `RetentionService` batches delete/anonymize per entity's `retention` policy.
- Tenant isolation (`tenantFilter.ts` + `rls.ts`) activates automatically for any entity with an `organizationId`/`organization` relation.

Gaps called out in `COMPLIANCE_GAPS_PLAN.md` (consent management, pen testing, DR testing) are framework/CLI-level and orthogonal to this service. The **new** thing this service needs that doesn't exist yet is the `CodeSetLicense` entity/feature-gate itself (§5) — everything else is reuse.

Before any real hospital data touches the system: run an external security review, same as any other PHI-bearing service on this stack.

### Test/QA strategy (confirmed against existing test conventions — fills a prior gap)

`billing-base`'s tests (`__test__/test-utils.ts`, `plan.test.ts`) use `BlueprintTestHarness` from `@forklaunch/testing`, backed by **real `testcontainers`** (Postgres + Redis) — not mocks, not in-memory sqlite. Test data is seeded via real MikroORM entities, and assertions call the generated route SDK in-process (`route.sdk.createPlan({...})`) rather than raw HTTP. This directly answers the previously-open question of how to validate the mock→real CPT cutover: **spin up the real containerized test DB, seed a representative subset of both mock and real code pairs (including at least one of each CARC scenario in §6's table), and assert against the actual `sdk.*` calls end-to-end** — not a mocked unit test — before flipping `CodeSetLicense.status` to `active` for any real organization.

---

## 10. Phased delivery plan

Directly adopting the source doc's phases, corrected for the domain-accuracy fixes in §6–8:

| Phase | Focus | CPT needed? | Concrete engineering tasks |
|---|---|---|---|
| **0** (Wk 1–4) | Foundations | No | Stedi sandbox credentials (§8); confirm HIPAA-ready hosting + BAA; scaffold `medical-coding-base` service skeleton (`forklaunch init service`); synthetic test dataset |
| **1** (Wk 3–6) | Code validation | No | ICD-10-CM loader; extend to HCPCS Level II; define all entities in §4 with `defineComplianceEntity`; stand up `scripts/refresh-code-sets.ts` (§7) even before it's needed on a schedule, so the ETL shape exists from day one |
| **2** (Wk 6–10) | Claim engine & scrubbing, mock codes | No — placeholders | `MockProcedureCodeProvider`; claim builder (encounter+charges+diagnoses→claim); scrubbing rules across all **three layers** from §6 — mock NCCI PTP pairs, mock MUE unit caps, mock LCD-style diagnosis-procedure crosswalk; clearinghouse sandbox submission end-to-end via Stedi |
| **3** (Wk 10–14) | Eligibility & remittance | No | EDI 270/271 eligibility check at intake (blocks CO-27); 835 remittance parsing, auto-post + CARC/RARC capture; 277CA/999 acknowledgment handling; denial worklist UI |
| **4** (Wk 14–16) | Analytics & compliance hardening | No | Clean-claim-rate / denial-rate / days-in-A/R dashboard (benchmarked against §11); confirm RBAC + audit logging on every PHI path; external security review |
| **5** (Mo 4–6) | Sales demos | No — mock codes | Demo to small clinics/billing companies; use CO-27/CO-16/CO-97 denial examples as live proof points; be transparent that CO-11/CO-50 (LCD/NCD) checks run against mock diagnosis-procedure mappings pre-license, and that historical claims are never retroactively recoded post-license (§5) |
| **6** (Trigger-based) | CPT licensing & go-live | **Yes** | On trigger: contact AMA immediately (§2); file license 4–6 weeks before go-live target, budgeting per-clinician royalty pricing (§2); once signed — implement `CptCodeProvider`, flip `CodeSetLicense.status='active'` for that org, run the container-based cutover test suite (§9) against real CPT+ICD-10 pairs before first real claim |

**Do not start Phase 6 on a calendar** — it's trigger-based off a real signed/verbally-confirmed paying client, run in parallel with that client's onboarding.

---

## 11. Success metrics (benchmarked against industry data — refines the source doc's targets)

| Metric | Trial baseline | Plan target | Industry benchmark context |
|---|---|---|---|
| Clean claim rate | 60% | 95%+ | Matches MGMA's "good performance" benchmark (~95%); industry median is often 85–90%. **Credible, appropriately aggressive.** |
| Denial rate | 30% | Under 5% | HFMA considers <5% "optimal," but industry average is 5–10% and initial denial rates were ~11.8% in 2024, trending toward 12–15%. **This is a best-in-class target, not a typical baseline — it will require real scrubbing-engine automation (§6), not just clean data entry.** |
| Average days to payment | 24 days | Under 40 days | MGMA's 2024 survey shows top performers at 36 days vs. a 47-day median; HFMA's healthy range is 30–40. **Realistic/good as stated — consider tightening to sub-35 days to match a genuine "high performer" framing rather than just "healthy."** |

---

## 12. Open questions

1. **Provider abstraction naming/location** — does `CodeSetProvider` live inside `medical-coding-base` itself, or do we want a shared `codeSet` interfaces package under our own product's libraries (analogous to `blueprint/interfaces/billing`) in case we build more than one service against it later?
2. **IAM cross-service integration** — does the hospital's staff (coders/billers) get provisioned in the *existing* `iam-base` service as `User`s with new `Role`s, or does this need its own lightweight staff directory? (Recommend: existing IAM — the cross-service SDK mechanism in §3 makes this straightforward, and avoids duplicating auth.)
3. **CO-11/CO-50 demo honesty** — Phase 5 demos must clearly disclose to prospects that LCD/NCD-style medical-necessity checks run against a mock diagnosis-procedure crosswalk pre-license, not real CMS coverage data; confirm sales is aligned on this messaging.
4. **Mock LCD/NCD data source** — who owns building a plausible mock diagnosis-procedure crosswalk for Phase 2 (a coding/compliance SME, not engineering alone) so the three-layer scrubbing design in §6 is exercised realistically before real CPT/LCD data exists?

---

## 13. Immediate next steps

1. Create a Stedi sandbox account (free) and request API credentials (§8).
2. Finalize the `medical-coding-base` entity schema (§4) — including the SSN/surrogate-ID decision — and confirm HIPAA-ready hosting/BAA.
3. Extend the existing ICD-10 loader to HCPCS using the same pattern; stand up the `refresh-code-sets.ts` ETL shape (§7) even before its first scheduled run.
4. Build the scrubbing rules engine against `MockProcedureCodeProvider`, implementing all **three** rule layers from §6, not a single check.
5. Begin outreach to small clinics/billing companies for early demos — no license required yet.
6. Only after a paying client is confirmed: contact AMA and start the CPT licensing process (§2), budgeting for per-clinician royalty pricing rather than a flat fee.

---

## 14. Sources

Domain research behind §2, §6, §7, §8, and §11:

- CMS — [NCCI Procedure-to-Procedure (PTP) Edits](https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-procedure-procedure-ptp-edits)
- CMS — [NCCI Medically Unlikely Edits (MUEs)](https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits-mues)
- CMS — [Medicare Coverage Database (LCD/NCD search)](https://www.cms.gov/medicare-coverage-database/search.aspx)
- CMS — [HCPCS Quarterly Update](https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system/quarterly-update)
- CDC — [ICD-10-CM files](https://www.cdc.gov/nchs/icd/icd-10-cm/files.html); AAPC — [FY2026 ICD-10-CM guidelines](https://www.aapc.com/blog/92967-coding-update-fy-2026-icd-10-cm-official-guidelines-released/)
- AMA — [CPT 2026 code set release](https://www.ama-assn.org/press-center/ama-press-releases/ama-releases-cpt-2026-code-set)
- AAPC — [CARC/RARC/MREP update cadence](https://www.aapc.com/codes/exclusives/transmittals/claim-adjustment-reason-code-carc-remittance-advice-remark-code-rarc-and-medicare-remit-easy-print-mrep-update-2); X12 — [code lists](https://x12.org/codes); X12 — [Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)
- WEDI — [HIPAA Transactions and Operating Rules](https://www.wedi.org/hipaa-transactions-and-operating-rules/); Accountable HQ — [EDI transactions explained](https://www.accountablehq.com/post/hipaa-edi-transactions-explained-types-x12-codes-and-compliance)
- AMA — [CPT Licensing FAQs](https://www.ama-assn.org/practice-management/cpt/cpt-licensing-frequently-asked-questions-faqs); AMA compliance portal — [Standard CPT Distribution Pricing Schedule 2026](https://compliance.ama-assn.org/hc/en-us/articles/15166274293399-Notice-Standard-CPT-Distribution-Pricing-Schedule-2026)
- MGMA-benchmarked summaries: Human Medical Billing — [2025 medical billing KPIs](https://humanmedicalbilling.com/blog/essential-medical-billing-kpis-for-2025-metrics-that-matter-for-revenue-cycle-success/); HFMA — [Redesigning denials management](https://www.hfma.org/revenue-cycle/redesigning-denials-management-in-the-obbba-era/); BillingBench — [RCM benchmarks](https://billingbench.com/benchmarks)
- Stedi — [API-first clearinghouse](https://www.stedi.com/blog/stedi-healthcare-the-only-api-first-clearinghouse-for-health-tech-companies) / [docs](https://www.stedi.com/docs/healthcare); Claim.MD — [software vendor integration](https://www.claim.md/services-software-vendors); Availity — [API guide](https://developer.availity.com/blog/2025/3/25/availity-api-guide)

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

Notably, **`framework/core`, `framework/express`, `framework/common` need zero changes** for either option — a grep across the framework for `iam`/`billing` turns up essentially nothing; RBAC, tenant isolation, compliance/encryption, and retention are already fully generic and module-agnostic (see §9). The entire Option B lift is CLI scaffolding + new blueprint packages, not framework work. There is also currently no doc describing "how to add a new module type to the framework itself" (`docs/adding-projects/modules.md` only covers consuming existing modules) — if Option B is pursued, that doc gap should be filled as part of the work.
