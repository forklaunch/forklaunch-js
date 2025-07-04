export const OrganizationStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;
export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];
