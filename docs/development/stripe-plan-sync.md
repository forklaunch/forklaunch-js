# Stripe Plan Synchronization

## Overview

The billing-stripe blueprint includes scripts to automatically sync billing plans from your constants to Stripe and seed your database. This ensures Stripe, your database, and your code stay in sync.

## Quick Start

### Complete Setup (Recommended)

Run the complete setup script to sync Stripe and seed the database in one command:

```bash
STRIPE_SECRET_KEY=sk_test_... npm run setup:billing
```

This will:
1. Create/update Stripe Products and Prices
2. Seed your database Plan table
3. Display product and price IDs

### Preview Changes (Dry Run)

Preview what will be synced without making changes:

```bash
STRIPE_SECRET_KEY=sk_test_... DRY_RUN=true npm run setup:billing
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Complete Setup | `npm run setup:billing` | Sync Stripe + seed database |
| Sync Stripe | `npm run sync:stripe` | Create/update Stripe products/prices |
| Seed Database | `npm run seed:plans` | Seed Plan table from Stripe |

## How It Works

### 1. Plan Constants

Plans are defined in `@forklaunch/blueprint-billing-base/constants.ts`:

```typescript
export const BillingPlanEnum = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
} as const;

export const PLAN_FEATURES = {
  free: [FEATURE_FLAGS.ADVANCED_TESTING, ...],
  pro: [FEATURE_FLAGS.CUSTOM_DOMAINS, ...],
  enterprise: [FEATURE_FLAGS.MULTI_REGION, ...]
};

export const PLAN_LIMITS = {
  free: { maxEnvironments: 2, maxServices: 3, ... },
  pro: { maxEnvironments: 10, maxServices: 20, ... },
  enterprise: { maxEnvironments: -1, ... }  // unlimited
};
```

### 2. Pricing Configuration

Edit `scripts/sync-stripe-plans.ts` to configure pricing:

```typescript
const PLAN_PRICING = {
  [BillingPlanEnum.FREE]: {
    price: 0,         // Free
    currency: 'usd',
    interval: 'month',
    description: 'Free tier with essential features'
  },
  [BillingPlanEnum.PRO]: {
    price: 2900,      // $29.00
    currency: 'usd',
    interval: 'month',
    description: 'Professional tier with advanced features'
  },
  [BillingPlanEnum.ENTERPRISE]: {
    price: 9900,      // $99.00
    currency: 'usd',
    interval: 'month',
    description: 'Enterprise tier with all features'
  }
};
```

### 3. Sync to Stripe

The sync script creates Stripe resources:

**Products:**
- One product per plan (FREE, PRO, ENTERPRISE)
- Stores features and limits in metadata
- Tagged with `forklaunch_plan` metadata key

**Prices:**
- One active price per product
- Configured amount and interval
- Recurring billing enabled

**Example Stripe Product Metadata:**
```json
{
  "forklaunch_plan": "pro",
  "features": "[\"custom_domains\", \"auto_scaling\", ...]",
  "maxEnvironments": "10",
  "maxServices": "20",
  "maxWorkers": "10",
  "maxMonthlyDeployments": "500"
}
```

### 4. Database Seeding

The seed script:
- Fetches products/prices from Stripe
- Creates Plan entities in database
- Links via `externalId` (Stripe product ID)
- Stores full Stripe data in `providerFields`

## Updating Plans

When you change plan features, limits, or pricing:

### 1. Update Constants

Edit plan configuration:
- `@forklaunch/blueprint-billing-base/feature-flags.ts` - Features per plan
- `@forklaunch/blueprint-billing-base/constants.ts` - Limits per plan

### 2. Update Pricing (if needed)

Edit `scripts/sync-stripe-plans.ts` if prices changed:
```typescript
const PLAN_PRICING = {
  [BillingPlanEnum.PRO]: {
    price: 3900,  // Changed from $29 to $39
    // ...
  }
};
```

### 3. Re-sync

```bash
STRIPE_SECRET_KEY=sk_test_... npm run setup:billing
```

**Note:** Existing subscriptions keep old prices. New subscriptions use new prices.

## Metadata Usage

The synced metadata enables:

### Feature Validation

```typescript
import { PLAN_FEATURES } from '@forklaunch-platform/billing/constants';

// Check if user's plan has a feature
const userPlanFeatures = new Set(PLAN_FEATURES[userPlan]);
if (userPlanFeatures.has(FEATURE_FLAGS.CUSTOM_DOMAINS)) {
  // Allow feature
}
```

### Limit Enforcement

```typescript
import { PLAN_LIMITS } from '@forklaunch-platform/billing/constants';

// Check resource limits
const limits = PLAN_LIMITS[userPlan];
if (environments.length >= limits.maxEnvironments) {
  throw new Error('Environment limit reached');
}
```

### Stripe Dashboard

View plan configuration directly in Stripe:
1. Go to Products in Stripe Dashboard
2. Click on a product
3. View metadata tab for features and limits

## Environment Considerations

### Development (Test Mode)

Use Stripe test keys:
```bash
STRIPE_SECRET_KEY=sk_test_abc123... npm run setup:billing
```

Test mode:
- Safe to experiment
- Use test cards (4242 4242 4242 4242)
- Won't charge real money

### Production (Live Mode)

Use Stripe live keys:
```bash
STRIPE_SECRET_KEY=sk_live_xyz789... npm run setup:billing
```

**⚠️ Important:**
- Test thoroughly in test mode first
- Backup database before production sync
- Coordinate with team (affects live pricing)

## Advanced Usage

### Custom Intervals

Support yearly pricing:

```typescript
const PLAN_PRICING = {
  [BillingPlanEnum.PRO]: {
    price: 29000,     // $290/year (save ~17%)
    interval: 'year', // Changed from 'month'
    // ...
  }
};
```

### Multiple Prices per Plan

Create both monthly and yearly:

```typescript
// Sync script creates one active price per product
// To support multiple intervals:
// 1. Run sync with interval: 'month'
// 2. Manually create yearly price in Stripe
// 3. Update checkout to show both options
```

### Custom Metadata

Add additional metadata:

```typescript
// In sync script, modify productData
const productData = {
  name: product.name,
  metadata: {
    forklaunch_plan: planName,
    features: JSON.stringify(features),
    // Add custom fields
    support_tier: planName === 'enterprise' ? 'premium' : 'standard',
    sla_hours: planName === 'enterprise' ? '24' : '48'
  }
};
```

## Troubleshooting

### "STRIPE_SECRET_KEY environment variable is required"

**Solution:**
```bash
export STRIPE_SECRET_KEY=sk_test_...
# or inline:
STRIPE_SECRET_KEY=sk_test_... npm run setup:billing
```

### "Stripe product not found"

**Cause:** Database seeding ran before Stripe sync

**Solution:**
```bash
# Run sync first
STRIPE_SECRET_KEY=sk_test_... npm run sync:stripe

# Then seed
STRIPE_SECRET_KEY=sk_test_... npm run seed:plans
```

### Price Not Updating in Stripe

**Expected behavior:** Stripe doesn't allow updating price amounts. The script:
1. Deactivates old price
2. Creates new price
3. New subscriptions use new price
4. Existing subscriptions keep old price

**To migrate existing subscriptions:**
Use Stripe's subscription update API or dashboard.

### Plan Features Not Showing in Stripe

**Cause:** Metadata size limit (500 chars per value)

**Solution:** Abbreviate feature names or reference IDs:
```typescript
// Instead of storing full feature names
features: '["advanced_observability", "custom_domains", ...]'

// Store feature IDs or codes
features: '["obs", "dom", "reg", ...]'
```

## Integration Examples

### Checkout Flow

```typescript
import { PLAN_FEATURES } from '@forklaunch-platform/billing/constants';

// Get Stripe price for a plan
const plan = await em.findOne(Plan, { name: 'pro' });
const stripePrice = plan.providerFields.default_price;

// Create checkout session
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: stripePrice,
    quantity: 1
  }],
  mode: 'subscription',
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel'
});
```

### Subscription Validation

```typescript
import { validateRequiredFeatures } from '@forklaunch-platform/billing/utils';
import { PLAN_FEATURES } from '@forklaunch-platform/billing/constants';

// In your route handler
const userFeatures = new Set(PLAN_FEATURES[userSubscription.planName]);

if (!validateRequiredFeatures(['custom_domains'], userFeatures)) {
  return res.status(403).json({
    error: 'Upgrade to Pro to use custom domains'
  });
}
```

## Related Documentation

- [Subpath Exports](./subpath-exports.md) - Using billing module exports
- [Feature Flags](../../blueprint/billing-base/feature-flags.ts) - Available features
- [Stripe API](https://stripe.com/docs/api) - Stripe documentation

## Script Locations

All scripts are in `/blueprint/billing-stripe/scripts/`:

- `sync-stripe-plans.ts` - Stripe sync logic
- `seed-plans-from-stripe.ts` - Database seeding
- `setup-billing.ts` - Complete setup wrapper
- `README.md` - Detailed script documentation

---

**Last Updated:** 2026-02-03
