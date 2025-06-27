/**
 * Runtime string utility functions that mirror the TypeScript utility types
 */

import type {
  CamelCaseIdentifier,
  PrettyCamelCase,
  ValidIdentifier
} from './types/camelCase.types';

/**
 * Regular expression for separators
 */
const SEPARATOR_REGEX = /[ \-_./:]+/g;

/**
 * Regular expression for leading separators
 */
const LEADING_SEPARATOR_REGEX = /^[ \-_./:]+/;

/**
 * Regular expression for non-alphanumeric characters
 */
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;

/**
 * Regular expression for leading numbers
 */
const LEADING_NUMBERS_REGEX = /^[0-9]+/;

/**
 * Remove leading separators from a string
 */
export function removeLeadingSeparators(str: string): string {
  return str.replace(LEADING_SEPARATOR_REGEX, '');
}

/**
 * Split a string by separators (space, dash, underscore, dot, slash, colon)
 */
export function splitBySeparators(str: string): string[] {
  return str.split(SEPARATOR_REGEX).filter((part) => part.length > 0);
}

/**
 * Remove all non-alphanumeric characters from a string
 */
export function removeNonAlphanumeric(str: string): string {
  return str.replace(NON_ALPHANUMERIC_REGEX, '');
}

/**
 * Remove leading numbers from a string to make it a valid identifier
 */
export function removeLeadingNumbers(str: string): string {
  return str.replace(LEADING_NUMBERS_REGEX, '');
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert the first letter to lowercase
 */
export function uncapitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Join an array of strings into camelCase
 */
function joinCamelCase(parts: string[]): string {
  if (parts.length === 0) return '';

  const cleanedParts = parts
    .map(removeNonAlphanumeric)
    .filter((part) => part.length > 0);

  if (cleanedParts.length === 0) return '';

  const [first, ...rest] = cleanedParts;
  return uncapitalize(first) + rest.map(capitalize).join('');
}

/**
 * Join an array of strings into camelCase with all parts lowercased first (prettier version)
 */
function joinPrettyCamelCase(parts: string[]): string {
  if (parts.length === 0) return '';

  const cleanedParts = parts
    .map((part) => removeNonAlphanumeric(part.toLowerCase()))
    .filter((part) => part.length > 0);

  if (cleanedParts.length === 0) return '';

  const [first, ...rest] = cleanedParts;
  return first + rest.map(capitalize).join('');
}

/**
 * Convert a string to a valid TypeScript identifier in camelCase
 * Always returns a string, defaulting to the input if transformation fails
 *
 * @param str - The input string to transform
 * @returns The camelCase identifier or the original string if transformation fails
 *
 * @example
 * ```typescript
 * toCamelCaseIdentifier("hello-world"); // "helloWorld"
 * toCamelCaseIdentifier("my_var_name"); // "myVarName"
 * toCamelCaseIdentifier("some.property.name"); // "somePropertyName"
 * toCamelCaseIdentifier("123invalid"); // "invalid"
 * toCamelCaseIdentifier("hello world"); // "helloWorld"
 * toCamelCaseIdentifier("API-Key"); // "aPIKey"
 * toCamelCaseIdentifier("/organization/base"); // "organizationBase"
 * ```
 */
export function toCamelCaseIdentifier<T extends string>(
  str: T
): CamelCaseIdentifier<T> {
  if (typeof str !== 'string') return String(str) as CamelCaseIdentifier<T>;

  try {
    const withoutLeadingSeparators = removeLeadingSeparators(str);
    const parts = splitBySeparators(withoutLeadingSeparators);
    const camelCased = joinCamelCase(parts);
    const withoutLeadingNumbers = removeLeadingNumbers(camelCased);

    // If result is empty or failed, return original string
    return (withoutLeadingNumbers || str) as CamelCaseIdentifier<T>;
  } catch {
    // If any error occurs, return original string
    return str as CamelCaseIdentifier<T>;
  }
}

/**
 * Pretty camelCase conversion that handles abbreviations more intuitively
 * Always returns a string, defaulting to the input if transformation fails
 *
 * @param str - The input string to transform
 * @returns The pretty camelCase identifier or the original string if transformation fails
 *
 * @example
 * ```typescript
 * toPrettyCamelCase("API-Key"); // "apiKey"
 * toPrettyCamelCase("HTTP-Response"); // "httpResponse"
 * toPrettyCamelCase("user-ID"); // "userId"
 * toPrettyCamelCase("get-user-by-id"); // "getUserById"
 * toPrettyCamelCase("/organization/base"); // "organizationBase"
 * ```
 */
export function toPrettyCamelCase<T extends string>(
  str: T
): PrettyCamelCase<T> {
  if (typeof str !== 'string') return String(str) as PrettyCamelCase<T>;

  try {
    const withoutLeadingSeparators = removeLeadingSeparators(str);
    const parts = splitBySeparators(withoutLeadingSeparators);
    const camelCased = joinPrettyCamelCase(parts);
    const withoutLeadingNumbers = removeLeadingNumbers(camelCased);

    // If result is empty or failed, return original string
    return (withoutLeadingNumbers || str) as PrettyCamelCase<T>;
  } catch {
    // If any error occurs, return original string
    return str as PrettyCamelCase<T>;
  }
}

/**
 * Alternative implementation using a more comprehensive approach
 * for complex cases with better handling of edge cases
 */
export function toValidIdentifier<T extends string>(
  str: T
): ValidIdentifier<T> {
  return toCamelCaseIdentifier(str);
}

/**
 * Check if a string is a valid JavaScript/TypeScript identifier
 */
export function isValidIdentifier(str: string): boolean {
  if (typeof str !== 'string' || str.length === 0) return false;

  // Must start with letter, underscore, or dollar sign
  if (!/^[a-zA-Z_$]/.test(str)) return false;

  // Must contain only letters, numbers, underscores, or dollar signs
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

/**
 * Get detailed information about the transformation process
 * Useful for debugging and understanding how the transformation works
 */
export function getTransformationInfo(str: string): {
  original: string;
  withoutLeadingSeparators: string;
  parts: string[];
  camelCase: string;
  prettyCamelCase: string;
  withoutLeadingNumbers: string;
  prettyCamelCaseWithoutLeadingNumbers: string;
  isValid: boolean;
} {
  const withoutLeadingSeparators = removeLeadingSeparators(str);
  const parts = splitBySeparators(withoutLeadingSeparators);
  const camelCase = joinCamelCase(parts);
  const prettyCamelCase = joinPrettyCamelCase(parts);
  const withoutLeadingNumbers = removeLeadingNumbers(camelCase);
  const prettyCamelCaseWithoutLeadingNumbers =
    removeLeadingNumbers(prettyCamelCase);

  return {
    original: str,
    withoutLeadingSeparators,
    parts,
    camelCase,
    prettyCamelCase,
    withoutLeadingNumbers,
    prettyCamelCaseWithoutLeadingNumbers,
    isValid: isValidIdentifier(withoutLeadingNumbers)
  };
}
