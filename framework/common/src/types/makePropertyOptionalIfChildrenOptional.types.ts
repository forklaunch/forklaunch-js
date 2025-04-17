/**
 * Helper type that checks if all properties of a type are optional.
 *
 * @template T - The type to check
 */
type AllPropertiesOptional<T> =
  T extends Partial<T> ? (Partial<T> extends T ? true : false) : false;

/**
 * Type that makes properties optional if all their children are optional.
 * This is useful for creating types where properties are only optional if their nested properties are all optional.
 *
 * @template T - The type to transform
 * @example
 * type User = {
 *   name: string;
 *   address?: {
 *     street?: string;
 *     city?: string;
 *   };
 * };
 * type Transformed = MakePropertyOptionalIfChildrenOptional<User>;
 * // Result: { name: string; address?: { street?: string; city?: string; } }
 */
export type MakePropertyOptionalIfChildrenOptional<T> = {
  [K in keyof T as AllPropertiesOptional<T[K]> extends true ? K : never]?: T[K];
} & {
  [K in keyof T as AllPropertiesOptional<T[K]> extends true ? never : K]: T[K];
};
