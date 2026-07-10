# Running the ecommerce backend yourself — what it needs

This is for whoever stands up their own copy of the ForkLaunch ecommerce
backend (`ecommerce-stripe`) — no shared, always-on server from ForkLaunch
required. Run it on your own infrastructure.

## What has to already exist

- A Postgres database, reachable from wherever this runs
- Node + pnpm to build and run it
- A Stripe account (test or live) if you want real payment to work

There is no Dockerfile for this yet — it runs as a plain Node process, same
as the rest of this codebase's services. You'll build your own deployment
around the commands below however your infrastructure normally does that.

## Required environment variables

| Variable | What it's for |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Your Postgres connection |
| `NODE_ENV` | Standard Node environment name |
| `HOST`, `PORT` | Where this service itself listens |
| `VERSION` | API version string, used in the URL path |
| `DOCS_PATH` | Where the API reference is served, e.g. `/docs` |
| `ENCRYPTION_KEY` | Encrypts sensitive fields at rest (this module tags customer/payment-related fields for automatic encryption) |
| `HMAC_SECRET_KEY` | The secret used to authenticate calls to `/catalog-import` — generate your own, keep it private, it's yours to control since you're running the server |
| `JWKS_PUBLIC_KEY_URL` | Public-key URL used to verify normal user-facing auth tokens (separate from the HMAC secret above, which is only for service-to-service calls) |
| `STRIPE_API_KEY` | Your Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Your Stripe webhook signing secret |
| `OTEL_SERVICE_NAME`, `OTEL_LEVEL`, `OTEL_EXPORTER_OTLP_ENDPOINT` | Logging/observability export — point at your own collector, or leave logging local if you don't have one yet |

**Important:** since you're the one running this, you generate
`HMAC_SECRET_KEY` and `ENCRYPTION_KEY` yourself — nobody hands those to you.
Whatever tool calls `/catalog-import` needs the same `HMAC_SECRET_KEY` value
you set here.

## Commands, in order

```
pnpm install
pnpm run migrate:up      # creates the database tables
pnpm run build
pnpm run start            # or: pnpm run dev, for a version that reloads on file changes
```

The service prints its own URL and API-docs path on startup.

## Payment providers — what's actually wired in today

Only **Stripe** is connected in the version of this service that runs out
of the box. A PayPal implementation exists as its own separate piece of
code, but it isn't wired into this running service yet — don't expect a
PayPal endpoint to work until that's connected.

## What this service does not include yet

- No background job processing (shipping labels, order emails, etc.) —
  those pieces aren't built
- No catalog search/filtering beyond fetching by ID
- No unified checkout endpoint — creating an order and taking payment are
  currently separate calls, not one guided flow
- No customer or historical order migration — only the product catalog
  loads through `/catalog-import` today
