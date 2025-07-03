export const PlanCadenceEnum = {
  WEEKLY: 'WEEKLY',
  BIWEEKLY: 'BIWEEKLY',
  MONTHLY: 'MONTHLY',
  ANNUALLY: 'ANNUALLY'
} as const;
export type PlanCadenceEnum =
  (typeof PlanCadenceEnum)[keyof typeof PlanCadenceEnum];
