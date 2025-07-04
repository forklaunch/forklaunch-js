/**
 * Merges two objects by unioning the values for duplicate keys
 */
export type MergeUnionOnCollision<T, U> = {
  [K in keyof T | keyof U]: K extends keyof T
    ? K extends keyof U
      ? T[K] | U[K]
      : T[K]
    : K extends keyof U
      ? U[K]
      : never;
};
