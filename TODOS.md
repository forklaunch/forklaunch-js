# TODOS

## `fl deploy rollback` fails to compile for any app with a websocket-capable service (P0/P1)

**What:** `fl deploy rollback -d <deployment-id> -t <target-release-id>` fails every time on a
three-service app (`iam`/`billing`/`platform`, node/express, no special config). The generated
Pulumi program doesn't even compile:

```
index.ts(3399,21): error TS2304: Cannot find name 'targetGroup_iam_11000'.
index.ts(3872,21): error TS2304: Cannot find name 'targetGroup_billing_11000'.
index.ts(4315,21): error TS2304: Cannot find name 'targetGroup_platform_11000'.
```

**Why:** `11000` is the websocket port (`WS_PORT=11000`, present on every scaffolded service by
default). The rollback code-generation path references a `targetGroup_<service>_11000` variable
for every service in the app, but never actually declares it anywhere in the generated code — a
gap specific to the rollback generator, since normal `deploy create` for the same app worked fine
across three separate deploys. This isn't specific to our test app's config; nothing unusual was
done to trigger it (default scaffold, default websocket wiring).

**Impact:** `fl deploy rollback` cannot currently succeed for any app with a websocket-capable
service — which, since the framework wires websockets by default for every scaffolded service,
is likely most real apps. The investigator skill's entire "roll back to a known-good version"
guidance is currently untestable/non-functional for a typical app.

**Confirmed safe:** the rollback fails at the Pulumi program's TypeScript compile step, before
touching any real infrastructure — the app's services stayed `running` at the pre-rollback version
throughout, unaffected.

**Effort:** M (need to find where the rollback path's code generator omits declaring the websocket
target group that the normal deploy path already knows how to create)
**Priority:** P0/P1 — makes a fully-documented, expected-to-work CLI command non-functional for
the common case
**Depends on:** none

## "iam" is a silently reserved service name — using it without the iam-base/iam-better-auth module panics the CLI (P1)

**What:** `fl init service iam -d postgresql` (a plain custom service, not the `-m iam-base`/
`iam-better-auth` module preset) succeeds. But the *next* `fl init service <anything>` call panics:
`thread 'main' panicked at src/core/docker.rs:1857:10: called Option::unwrap() on a None value`.

**Why:** `add_iam_environment_variables_to_docker_compose` (docker.rs:1841) runs on every project
whenever docker-compose.yaml gets regenerated (i.e. on every subsequent `init service`), and for
any project literally named `iam` it unconditionally assumes a `.variant` field is set —
`iam_project.unwrap().variant.as_ref().unwrap()`. That field is only populated when `iam` comes
from the real `iam-base`/`iam-better-auth` module preset. A plain custom service named `iam` has no
variant, so this panics — not on the service you're adding, but as a side effect of regenerating
the compose file for the *whole app*, breaking every future `init service` call for that app
permanently until `iam` is removed or replaced with the real module.

**Reproduction:** `fl init application` (no `-m` flags) → `fl init service iam` (succeeds) →
`fl init service <second-service>` (panics, regardless of the second service's name).

**Fix:** either reserve `iam` as a name (reject it for plain `init service`, matching how it's
apparently expected to only come from the module preset), or make
`add_iam_environment_variables_to_docker_compose` handle a variant-less `iam` project gracefully
instead of panicking.

**Effort:** S
**Priority:** P1 — silent landmine with no warning at the time the mistake is made (naming a
service `iam`), only surfaces later and blocks all further scaffolding
**Depends on:** none

## First deploy of a brand-new app can fail permanently on a Route53 record collision (P0)

**What:** The very first deploy of a genuinely new app (never deployed before — confirmed via
`fl deploy info -e <env>` showing no prior deployment history) failed with:
`InvalidChangeBatch: [Tried to create resource record set [name='...ns-delegation...', type='NS']
but it already exists]`. Retrying the exact same deploy failed again, identically, immediately (10s,
vs. the original's ~14min) — not self-healing.

**Why this is bad:** the Pulumi stack's tracked state doesn't know about these two Route53 records
(NS delegation + ACM cert-validation CNAME), but AWS actually has them — durable state drift, not a
transient retry hiccup. Nothing in the CLI (`deploy info`, `observe logs`, `infra status`) can
detect or fix this; the only recovery that worked was a full `deploy destroy` (which itself took
~27 minutes, far longer than a normal teardown, presumably reconciling the same drift on the way
out) and presumably a fresh deploy attempt after.

**Likely root cause:** the deploy's own internal retry logic (seen elsewhere too — CodeBuild
"Build failed instantly — likely IAM propagation delay, retrying") probably succeeded in creating
these two records on an earlier internal attempt within the same `deploy create` invocation, but
Pulumi's state didn't get persisted with that success before the next retry ran, so it tried to
create the same records again and got a hard AWS-level rejection instead of a benign "already
exists, adopting" outcome.

**Confirmed via AWS CLI: `deploy destroy` does not clean up the drifted resources either.** After
running `deploy destroy` (which reported completed), the app's Route53 hosted zone
(`investigator-staging-us-west-2-e498720e.app.forklaunch.com`) was still present in the account,
containing the same orphaned ACM cert-validation CNAME record from the original collision — because
Pulumi's state never tracked these two records as existing, `destroy` (which only deletes what's in
state) skipped them too. So this bug leaves real orphaned AWS resources behind even after a
"successful" teardown, not just a failed deploy. Small ongoing cost (hosted zone, ~$0.50/mo) but
real drift accumulating in the account with no CLI-visible trace.

**Escalation — confirmed via direct AWS CLI audit: orphaned resources include LIVE, running
infrastructure under a hash that never appears again anywhere.** Pulumi generates a new random hash
per retry attempt, not one stable hash per app. The failed first attempt (hash `46d4427c`) created
two fully live Application Load Balancers (`shared-alb`, `mon-alb`, confirmed via
`elbv2 describe-tags`: correct `ApplicationId`, `ApplicationName`, `StackName`, `ReleaseVersion` —
unambiguously ours) plus 4 security groups plus 1 VPC endpoint (SSM) — none of which had target
groups or listeners (i.e. served zero traffic, pure orphaned cost). The app's *later*, successful
deploy used a completely different hash (`e498720e`), so nothing about the running app — not
`deploy info`, not `app services`, not `infra list`, not the dashboard's own app overview page —
ever surfaces the `46d4427c` hash again. The only way we found this was a manual, resource-type-by-
resource-type AWS CLI audit across every hash mentioned anywhere in any deploy log from the app's
history. This is real, ongoing AWS cost (2 ALBs is not free) sitting invisibly in the account with
literally no CLI or dashboard path to discover it exists, for every failed-then-retried deploy.

**Effort:** M-L (needs to either make the retry logic refresh/import existing resources before
retrying, or handle "already exists" for these two resource types as success rather than failure).
Separately, worth considering: `deploy destroy` should attempt to discover and clean up orphaned
resources tagged with the app's `ApplicationId` across *all* historical stack hashes, not just the
current Pulumi state's hash, since state drift is exactly the scenario where this matters most.
**Priority:** P0 — can permanently block a brand-new app's very first deploy AND silently leaves
live, billed infrastructure with zero CLI/dashboard visibility
**Depends on:** none

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

## Investigator Skill Live Validation Findings (2026-08-26)

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

**What:** After a **database** deploys successfully, its resource-management record stays a
`template` placeholder forever — `serviceName: null`, `region: "_TEMPLATE_"`, `status: "template"`.
Confirmed via `fl infra list -e <env> --json`. Cache and queue resources were never provisioned or
tested in this session — whether they share this bug is unverified, not confirmed. Don't generalize
beyond database until someone reproduces it with a cache or queue resource.

**Why:** This breaks every command that depends on resolving a database resource by project name
or id: `fl infra status <project>:database` (can't match by name, `--resource-id` override returns
no real metric data either), `fl data db tables/schema/rows/query --resource <id>` (404 "Resource
not found or no credentials available"). The database itself is confirmed working — a real query
against it returned a real Postgres error — this is purely the platform never syncing the resource
record after provisioning.

**Effort:** M-L (need to find where the deploy pipeline creates the placeholder vs. where it should
write back the real resource identity post-provision)
**Priority:** P0 for database resources — this silently breaks the entire infra-health and
data-explorer diagnostic surface for any app with a database, not just this test app. Confirm
whether cache/queue are affected before treating this as P0 for those too.
**Depends on:** none

### `fl app services` has no per-service URL field (narrower than first thought)

**What:** `fl app services` (including `--json`) only returns id/name/status/type/version — no
URL. Correction to an earlier version of this finding: this is **not** a total gap.
`deploy create`/`deploy destroy`'s foreground live-wait path (`stream_deployment_status` in
`deploy/utils.rs`) already prints `endpoints.api`/`endpoints.docs` when present. We missed this
because this session always used `--no-wait` (needed for background polling), which skips that
output entirely.

**Why it's still a real gap:** that endpoint only prints once, live, during the specific deploy
invocation that happens to run in foreground mode — there's no way to look it up afterward, from a
different terminal, for an app deployed with `--no-wait`, or (unclear, needs checking) as a
per-service breakdown for a multi-service app rather than one whole-app endpoint. An agent
diagnosing an already-running deployment (the normal investigator-skill scenario, not the one doing
the deploying) still has no CLI path to discover a service's URL after the fact.

**Effort:** S — likely just needs `app services`/a new field to expose the same stack output
`stream_deployment_status` already has access to, so it's available after the fact and per-service
**Priority:** P2 (downgraded from P1 now that a partial path exists) — blocks after-the-fact URL
discovery, not all URL discovery
**Depends on:** none
