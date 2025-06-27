/**
 * Utility types for string manipulation and validation
 */

/**
 * Remove leading separators from a string
 */
type RemoveLeadingSeparators<S extends string> =
  S extends `${' ' | '-' | '_' | '.' | '/' | ':'}${infer Rest}`
    ? RemoveLeadingSeparators<Rest>
    : S;

/**
 * Split a string by separators (space, dash, underscore, dot, slash, colon)
 */
type SplitBySeparators<S extends string> =
  S extends `${infer First}${' ' | '-' | '_' | '.' | '/' | ':'}${infer Rest}`
    ? [First, ...SplitBySeparators<Rest>]
    : S extends ''
      ? []
      : [S];

/**
 * Capitalize the first letter of a string
 */
type Capitalize<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Uppercase<First>}${Rest}`
  : S;

/**
 * Convert the first letter to lowercase
 */
type Uncapitalize<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${Rest}`
  : S;

/**
 * Remove all non-alphanumeric characters from a string
 */
type RemoveNonAlphanumeric<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? First extends
        | 'a'
        | 'b'
        | 'c'
        | 'd'
        | 'e'
        | 'f'
        | 'g'
        | 'h'
        | 'i'
        | 'j'
        | 'k'
        | 'l'
        | 'm'
        | 'n'
        | 'o'
        | 'p'
        | 'q'
        | 'r'
        | 's'
        | 't'
        | 'u'
        | 'v'
        | 'w'
        | 'x'
        | 'y'
        | 'z'
        | 'A'
        | 'B'
        | 'C'
        | 'D'
        | 'E'
        | 'F'
        | 'G'
        | 'H'
        | 'I'
        | 'J'
        | 'K'
        | 'L'
        | 'M'
        | 'N'
        | 'O'
        | 'P'
        | 'Q'
        | 'R'
        | 'S'
        | 'T'
        | 'U'
        | 'V'
        | 'W'
        | 'X'
        | 'Y'
        | 'Z'
        | '0'
        | '1'
        | '2'
        | '3'
        | '4'
        | '5'
        | '6'
        | '7'
        | '8'
        | '9'
      ? `${First}${RemoveNonAlphanumeric<Rest>}`
      : RemoveNonAlphanumeric<Rest>
    : '';

/**
 * Remove leading numbers from a string to make it a valid identifier
 */
type RemoveLeadingNumbers<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? First extends '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
      ? RemoveLeadingNumbers<Rest>
      : S
    : S;

/**
 * Join an array of strings into camelCase
 */
type JoinCamelCase<T extends readonly string[]> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends string
    ? Rest extends readonly string[]
      ? Rest['length'] extends 0
        ? Uncapitalize<RemoveNonAlphanumeric<First>>
        : `${Uncapitalize<RemoveNonAlphanumeric<First>>}${JoinCamelCaseCapitalized<Rest>}`
      : never
    : never
  : '';

/**
 * Join remaining parts with capitalized first letters
 */
type JoinCamelCaseCapitalized<T extends readonly string[]> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends string
      ? Rest extends readonly string[]
        ? Rest['length'] extends 0
          ? Capitalize<RemoveNonAlphanumeric<First>>
          : `${Capitalize<RemoveNonAlphanumeric<First>>}${JoinCamelCaseCapitalized<Rest>}`
        : never
      : never
    : '';

/**
 * Convert a string to a valid TypeScript identifier in camelCase
 * Always returns a string, defaulting to the input if transformation fails
 *
 * @example
 * ```typescript
 * type Example1 = CamelCaseIdentifier<"hello-world">; // "helloWorld"
 * type Example2 = CamelCaseIdentifier<"my_var_name">; // "myVarName"
 * type Example3 = CamelCaseIdentifier<"some.property.name">; // "somePropertyName"
 * type Example4 = CamelCaseIdentifier<"123invalid">; // "invalid"
 * type Example5 = CamelCaseIdentifier<"hello world">; // "helloWorld"
 * type Example6 = CamelCaseIdentifier<"API-Key">; // "aPIKey"
 * type Example7 = CamelCaseIdentifier<"/organization/base">; // "organizationBase"
 * ```
 */
export type CamelCaseIdentifier<S extends string> =
  RemoveLeadingNumbers<
    JoinCamelCase<SplitBySeparators<RemoveLeadingSeparators<S>>>
  > extends infer Result
    ? Result extends string
      ? Result extends ''
        ? S
        : Result
      : S
    : S;

/**
 * Improved version that handles consecutive uppercase letters better
 * by converting them to proper camelCase
 */
type LowerCaseWord<S extends string> = Lowercase<S>;

/**
 * More intuitive camelCase conversion that properly handles abbreviations
 *
 * @example
 * ```typescript
 * type Example1 = PrettyCamelCase<"API-Key">; // "apiKey"
 * type Example2 = PrettyCamelCase<"HTTP-Response">; // "httpResponse"
 * type Example3 = PrettyCamelCase<"user-ID">; // "userId"
 * ```
 */
type JoinPrettyCamelCase<T extends readonly string[]> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? First extends string
    ? Rest extends readonly string[]
      ? Rest['length'] extends 0
        ? LowerCaseWord<RemoveNonAlphanumeric<First>>
        : `${LowerCaseWord<RemoveNonAlphanumeric<First>>}${JoinPrettyCamelCaseCapitalized<Rest>}`
      : never
    : never
  : '';

type JoinPrettyCamelCaseCapitalized<T extends readonly string[]> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends string
      ? Rest extends readonly string[]
        ? Rest['length'] extends 0
          ? Capitalize<LowerCaseWord<RemoveNonAlphanumeric<First>>>
          : `${Capitalize<LowerCaseWord<RemoveNonAlphanumeric<First>>>}${JoinPrettyCamelCaseCapitalized<Rest>}`
        : never
      : never
    : '';

/**
 * Pretty camelCase conversion that handles abbreviations more intuitively
 * Always returns a string, defaulting to the input if transformation fails
 *
 * @example
 * ```typescript
 * type Example1 = PrettyCamelCase<"API-Key">; // "apiKey"
 * type Example2 = PrettyCamelCase<"HTTP-Response">; // "httpResponse"
 * type Example3 = PrettyCamelCase<"user-ID">; // "userId"
 * type Example4 = PrettyCamelCase<"get-user-by-id">; // "getUserById"
 * type Example5 = PrettyCamelCase<"/organization/base">; // "organizationBase"
 * ```
 */
export type PrettyCamelCase<S extends string> =
  RemoveLeadingNumbers<
    JoinPrettyCamelCase<SplitBySeparators<RemoveLeadingSeparators<S>>>
  > extends infer Result
    ? Result extends string
      ? Result extends ''
        ? S
        : Result
      : S
    : S;

/**
 * Alternative implementation using a more comprehensive approach
 * for complex cases with better handling of edge cases
 */
export type ValidIdentifier<S extends string> = CamelCaseIdentifier<S>;
