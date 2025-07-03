export const StatusEnum = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
} as const;
export type StatusEnum = (typeof StatusEnum)[keyof typeof StatusEnum];
