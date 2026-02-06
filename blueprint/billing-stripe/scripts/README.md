# Billing Stripe Scripts

Scripts for managing Stripe billing plans and syncing them with your database.

## Scripts

### `sync-stripe-plans.ts`

Syncs billing plans from your constants to Stripe as Products and Prices. This ensures Stripe has the correct products/prices configured based on your plan definitions.

**Usage:**
```bash
# Preview changes (dry run)
STRIPE_SECRET_KEY=sk_test_... DRY_RUN=true npm run sync:stripe

# Apply changes
STRIPE_SECRET_KEY=sk_test_... npm run sync:stripe
```

**What it does:**
- Creates Stripe Products for each plan (FREE, PRO, ENTERPRISE)
- Creates Stripe Prices with configured amounts and intervals
- Updates existing products/prices if configuration changed
- Stores plan features and limits in product metadata

**Configuration:**

Edit the `PLAN_PRICING` object in `sync-stripe-plans.ts`:

```typescript
const PLAN_PRICING = {
  [BillingPlanEnum.FREE]: {
    price: 0,
    currency: 'usd',
    interval: 'month',
    description: 'Free tier with essential features'
  },
  [BillingPlanEnum.PRO]: {
    price: 2900, // $29.00
    currency: 'usd',
    interval: 'month',
    description: 'Professional tier with advanced features'
  },
  [BillingPlanEnum.ENTERPRISE]: {
    price: 9900, // $99.00
    currency: 'usd',
    interval: 'month',
    description: 'Enterprise tier with all features'
  }
};
```

### `seed-plans-from-stripe.ts`

Seeds the database Plan table with data from Stripe products/prices. Run this **after** `sync-stripe-plans.ts` to ensure your database matches Stripe.

**Usage:**
```bash
STRIPE_SECRET_KEY=sk_test_... npm run seed:plans
```

**What it does:**
- Fetches products/prices from Stripe
- Creates/updates Plan entities in the database
- Links database records to Stripe products via `externalId`
- Stores full Stripe product data in `providerFields`

## Complete Workflow

### Initial Setup

1. **Configure plan pricing** in `sync-stripe-plans.ts`

2. **Sync to Stripe** (creates products/prices):
   ```bash
   STRIPE_SECRET_KEY=sk_test_... npm run sync:stripe
   ```

3. **Seed database** (creates Plan records):
   ```bash
   STRIPE_SECRET_KEY=sk_test_... npm run seed:plans
   ```

### Making Changes

When you update plan features, limits, or pricing:

1. Update constants in `@forklaunch/blueprint-billing-base/constants`
2. Update pricing in `PLAN_PRICING` if prices changed
3. Re-sync to Stripe:
   ```bash
   STRIPE_SECRET_KEY=sk_test_... npm run sync:stripe
   ```
4. Re-seed database:
   ```bash
   STRIPE_SECRET_KEY=sk_test_... npm run seed:plans
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (sk_test_... or sk_live_...) | Yes |
| `DRY_RUN` | Set to `true` to preview changes without applying | No |

## Plan Configuration

Plans are defined in `@forklaunch/blueprint-billing-base/constants.ts`:

- **BillingPlanEnum** - Plan identifiers (free, pro, enterprise)
- **PLAN_FEATURES** - Feature flags per plan
- **PLAN_LIMITS** - Resource limits per plan

These are automatically synced to Stripe product metadata.

## Stripe Product Metadata

Each product stores the following metadata:

```typescript
{
  forklaunch_plan: 'free|pro|enterprise',
  features: '["feature1", "feature2", ...]',
  maxEnvironments: '2',
  maxServices: '3',
  maxWorkers: '1',
  maxMonthlyDeployments: '50'
}
```

This allows you to:
- Query products by plan name
- Retrieve full plan configuration from Stripe
- Validate subscriptions against limits

## Testing

### Test Mode

Use test API keys (`sk_test_...`) during development:

```bash
STRIPE_SECRET_KEY=sk_test_abc123 npm run sync:stripe
```

### Production

Use live API keys (`sk_live_...`) for production:

```bash
STRIPE_SECRET_KEY=sk_live_xyz789 npm run sync:stripe
```

**⚠️ Warning:** Always test in test mode first!

## Troubleshooting

### "STRIPE_SECRET_KEY environment variable is required"

Set the environment variable:
```bash
export STRIPE_SECRET_KEY=sk_test_...
# or
STRIPE_SECRET_KEY=sk_test_... npm run sync:stripe
```

### "Stripe product not found"

Run `sync:stripe` before `seed:plans`:
```bash
STRIPE_SECRET_KEY=sk_test_... npm run sync:stripe
STRIPE_SECRET_KEY=sk_test_... npm run seed:plans
```

### Price changes not appearing

Stripe doesn't allow updating existing prices. The script automatically:
1. Deactivates the old price
2. Creates a new price with updated amount
3. New subscriptions will use the new price

Existing subscriptions continue on old prices until manually migrated.

## Related Files

- `../persistence/entities/plan.entity.ts` - Plan database entity
- `@forklaunch/blueprint-billing-base/constants.ts` - Plan constants and features
- `@forklaunch/blueprint-billing-base/feature-flags.ts` - Feature flag definitions

## Next Steps

After seeding plans:

1. **Create webhooks** to handle Stripe events (subscription creation, cancellation, etc.)
2. **Implement checkout** flow using the seeded plan prices
3. **Add subscription validation** middleware using `@forklaunch-platform/billing/utils`

See the billing documentation for more details.
