# TODOS

## Deployment status does not detect a silent ECS rollback (P0)

**What:** `fl deploy info` and `fl app services` report a deployment as `completed` / the service as
`running` at the new version, even when ECS's deployment circuit breaker has silently rolled back
to the previous task because the new one never became healthy. The live app keeps running the OLD
code with zero indication anything failed.

**Why this is critical:** confirmed by direct reproduction — deployed a release whose new container
crashes at import time (missing required env var, read directly rather than through the config
injector so the platform's pre-deploy scanner couldn't catch it). `deploy info` showed
`Status: completed`. `app services` showed `billing running 0.5.0`. But hitting the live URL proved
the OLD container was still serving: `/health` returned 200 (architecturally impossible if the new,
crashing code had actually started — it throws before Express binds a port), and `POST /billing`
reproduced the exact old bug from the previous release. `observe logs` (default otel source, and
`--source cloudwatch` with and without `--since`) showed nothing from the new deployment attempt at
all — no evidence the crash ever happened, from any CLI command.

**Impact:** every status/health-checking command in the investigator skill's diagnostic flow — the
recommended first thing to check — would report this situation as fully healthy. An agent (or a
human) has no CLI-visible way to learn that a deploy silently failed and reverted. This isn't a
missing nice-to-have; it makes "deploy completed" an untrustworthy signal.

**Likely root cause:** `deploy info`/`app services` appear to report on whether the *infrastructure
update* (Pulumi apply / ECS service update call) succeeded, not on whether the resulting task
actually passed health checks and stayed running. Need to either surface ECS deployment
circuit-breaker rollback events directly, or have deploy status poll actual task health post-update
before reporting `completed`.

**Effort:** L (touches deploy-status tracking and likely needs a new signal surfaced from
ECS/CodeDeploy events, not just Pulumi's own success/failure)
**Priority:** P0
**Depends on:** none

## Infrastructure

### fl infra restart (db/cache/queue reboot)

**What:** Add `fl infra restart <resource>` for database/cache/queue reboot.

**Why:** Completes the original command set discussed with Rohin — restart was one of the verbs considered alongside resize before being cut from v1 (`fl infra` plan, 2026-07-10).

**Context:** No restart/reboot capability exists anywhere in the platform today for RDS/ElastiCache/MSK — the only reboot code found is an internal, non-general-purpose Blue/Green pre-step inside RDS major-version modification. Building this needs three genuinely different AWS operations with different semantics: RDS instance reboot is simple (`RebootDBInstanceCommand`), ElastiCache reboot is per-node (needs enumerating cache nodes), MSK reboot is per-broker (needs enumerating brokers). No shared code path today. Pick up after v1 (list/status/resize/config-set/creds) ships and infra/mod.rs's dispatch pattern is proven out.

**Effort:** L
**Priority:** P3
**Depends on:** `fl infra` v1 shipping first (this plan)

### CI/HMAC-mode support for fl infra

**What:** Design and build HMAC/CI authentication support for the `fl infra` command family.

**Why:** `resize`/`config-set` are exactly the kind of operation teams want to script from CI/automation, but v1 ships JWT/session-only.

**Context:** Descoped from v1 via an outside-voice review finding: resource-management's routes use a discriminated `AccessLevel` type where `protected` (jwt/session+RBAC) and `internal` (hmac-only, RBAC forbidden) are mutually exclusive on a single route — confirmed against `@forklaunch/core`'s type definitions and platform-management's actual internal/protected route split. Building real parallel internal routes for CI support would give any HMAC-secret holder full mutate access with zero viewer/editor role distinction, a real security regression versus today. This needs its own security design session (which internal routes, how to scope/gate them per-caller) before any code — not a small follow-up.

**Effort:** XL
**Priority:** P2
**Depends on:** `fl infra` v1 shipping and proving out the JWT-mode command surface; a security design session before implementation

### fl infra status --metrics flag

**What:** Add a `--metrics` flag to `fl infra status <resource>` rendering the existing `GET /platform-resources/:id/metrics` timeseries (CloudWatch-style request-rate/error-rate/latency per resource).

**Why:** The platform API already exists and does zero new work to expose — today per-resource metrics visibility doesn't exist anywhere; `observe status` only covers whole-app health, not individual db/cache/queue instances.

**Context:** `GET /:id/metrics` returns `array({ id, label, timestamps: [string], values: [number] })`. This is a pure CLI-side render addition on top of an endpoint already scoped and read-tested by `fl infra status`'s base implementation — no new platform work, no new auth considerations beyond what `status` already has.

**Effort:** S
**Priority:** P3
**Depends on:** `fl infra status` existing first (Phase 2 of the `fl infra` v1 plan)

Note: this shipped as part of PR #261 — `fl infra status --metrics` already works. Leaving this
entry as a marker that it's done rather than deleting it silently.

## Investigator Skill Live Validation Findings (2026-08-26/27)

Found while live-validating the `/investigator` skill (`feat/agent-skills-investigator`) against a
real deployed single-service app. Not CLI bugs — the CLI correctly surfaces what each backend
returns; the backends themselves are broken or incomplete.

### `fl dlq list` / `fl dlq stats` crash server-side

**What:** Both fail with `Error: Failed to list DLQ jobs: require is not defined` /
`Error: Failed to get DLQ stats: require is not defined`.

**Why:** That's a Node `ReferenceError`, not an application error — the DLQ endpoint(s) are
crashing server-side, most likely a `require()` call surviving in an ESM context somewhere in the
handler or a dependency it pulls in.

**Effort:** S (once located)
**Priority:** P1 — DLQ is a documented investigator-skill diagnostic path and it's completely dead
**Depends on:** none

### `fl cloud-account` (status/list mode) crashes on the normal case

**What:** Running `fl cloud-account` with no subcommand (status/list mode) on an app with no BYOC
account linked — the default, most common case — fails with
`Error: Failed to parse cloud account response ... EOF while parsing a value at line 1 column 0`.

**Why:** The backend returns an empty response body when there's no linked account instead of a
valid "not linked" response, and the CLI has no fallback for an empty body.

**Effort:** S
**Priority:** P2
**Depends on:** none

### `fl openapi fetch` can't find a spec that demonstrably exists

**What:** `fl openapi fetch --service billing` returns `Error: Service 'billing' not found, or has
no OpenAPI spec in its release manifest.` — but the live service's own `/api/v1/openapi` endpoint
returns a real, valid spec when hit directly.

**Why:** Not yet root-caused. Likely the release manifest's OpenAPI export isn't reaching/matching
what this endpoint looks up by (service name vs id mismatch, or the spec upload step silently
no-ops). Needs investigation, not just a guess-fix.

**Effort:** M (needs root-cause first)
**Priority:** P2
**Depends on:** none

### Provisioned infra resources never get linked back to their real identity

**What:** After a database (or presumably cache/queue) deploys successfully, its
resource-management record stays a `template` placeholder forever — `serviceName: null`,
`region: "_TEMPLATE_"`, `status: "template"`. Confirmed via `fl infra list -e <env> --json`.

**Why:** This breaks every command that depends on resolving a resource by project name or id:
`fl infra status <project>:<type>` (can't match by name, `--resource-id` override returns no real
metric data either), `fl data db tables/schema/rows/query --resource <id>` (404 "Resource not
found or no credentials available"). The database itself is confirmed working — a real query
against it returned a real Postgres error — this is purely the platform never syncing the resource
record after provisioning.

**Effort:** M-L (need to find where the deploy pipeline creates the placeholder vs. where it should
write back the real resource identity post-provision)
**Priority:** P0 — this silently breaks the entire infra-health and data-explorer diagnostic surface
for any app with a database, cache, or queue, not just this test app
**Depends on:** none

### No CLI command surfaces a service's public endpoint/URL

**What:** There's no `fl` command that returns a deployed service's actual URL
(e.g. `https://billing.<app>-<env>-<region>-<hash>.app.forklaunch.com`). `fl app services`
(including `--json`) only returns id/name/status/type/version.

**Why:** The URL only appears once, buried in the deployment's raw Pulumi stack-output log stream
— which itself isn't retrievable via CLI (see the "no deployment logs" gap already known from
PR #261 review). An agent trying to actually hit a deployed service to test it has no CLI path to
discover the URL at all.

**Effort:** S — likely just needs `app services`/a new field to expose an existing stack output
**Priority:** P1 — blocks an agent from ever testing "does my deployed service actually respond"
without going to the dashboard
**Depends on:** none
