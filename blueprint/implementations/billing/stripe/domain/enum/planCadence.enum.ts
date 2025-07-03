export const PlanCadenceEnum = {
  WEEKLY: 'week',
  MONTHLY: 'month',
  ANNUALLY: 'year'
} as const;
export type PlanCadenceEnum =
  (typeof PlanCadenceEnum)[keyof typeof PlanCadenceEnum];
