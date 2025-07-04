export const PartyEnum = {
  USER: 'user',
  ORGANIZATION: 'organization'
} as const;
export type PartyEnum = (typeof PartyEnum)[keyof typeof PartyEnum];
