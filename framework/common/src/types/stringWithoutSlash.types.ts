/**
 * Utility type that excludes strings containing forward slashes
 */
export type StringWithoutSlash<T extends string> =
  T extends `${string}/${string}` ? 'cannot contain forward slashes' : T;
