/**
 * Utility type that converts a union type to an intersection type.
 * Uses TypeScript's conditional type inference to transform U | V into U & V.
 * This is a fundamental utility type used throughout the ForkLaunch framework
 * for merging multiple types into a single intersection.
 *
 * @template U - The union type to convert to an intersection
 * @param U - Any union type (e.g., A | B | C)
 *
 * @returns The intersection of all types in the union (e.g., A & B & C)
 *
 * @example
 * ```typescript
 * type Union = { a: string } | { b: number } | { c: boolean };
 * type Intersection = UnionToIntersection<Union>;
 * // Results in: { a: string } & { b: number } & { c: boolean }
 *
 * // Practical usage in API merging
 * type Api1 = { users: { getUser: () => Promise<User> } };
 * type Api2 = { posts: { getPosts: () => Promise<Post[]> } };
 * type MergedApi = UnionToIntersection<Api1 | Api2>;
 * // Results in: { users: { getUser: () => Promise<User> } } & { posts: { getPosts: () => Promise<Post[]> } }
 * ```
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Applies UnionToIntersection recursively to all children of an object type.
 * This is useful when you have an object where each property contains a union type,
 * and you want to convert all those unions to intersections while preserving
 * the object structure.
 *
 * @template U - The object type whose children should be converted
 * @param U - An object type where each property may be a union type
 *
 * @returns An object type with the same keys as U, but where each value
 *          has been processed through UnionToIntersection
 *
 * @example
 * ```typescript
 * type ApiConfig = {
 *   users: { getUser: () => Promise<User> } | { getUser: (id: string) => Promise<User> };
 *   posts: { getPosts: () => Promise<Post[]> } | { getPosts: (limit: number) => Promise<Post[]> };
 * };
 *
 * type NormalizedApi = UnionToIntersectionChildren<ApiConfig>;
 * // Results in:
 * // {
 * //   users: { getUser: () => Promise<User> } & { getUser: (id: string) => Promise<User> };
 * //   posts: { getPosts: () => Promise<Post[]> } & { getPosts: (limit: number) => Promise<Post[]> };
 * // }
 *
 * // This is particularly useful for merging multiple API configurations
 * // where each endpoint might have multiple overloads
 * ```
 */
export type UnionToIntersectionChildren<U> = {
  [K in keyof U]: UnionToIntersection<U[K]>;
};
