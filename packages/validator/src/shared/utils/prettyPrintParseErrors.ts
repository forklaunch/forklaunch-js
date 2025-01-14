import { ParseError } from '../types/schema.types';

/**
 * Pretty print parsing errors.
 *
 * @param {ParseError[]} errors - The errors to pretty print.
 * @returns {string | undefined} The pretty printed errors.
 */
export function prettyPrintParseErrors(
  errors?: ParseError[],
  prefix?: string
): string | undefined {
  const messageStart = `${prefix != null ? `${prefix} v` : 'V'}alidation failed`;
  if (!errors || errors.length === 0) return messageStart;

  const errorMessages = errors.map((err, index) => {
    const path = err.path.length > 0 ? err.path.join(' > ') : 'root';
    return `${index + 1}. Path: ${path}\n   Message: ${err.message}`;
  });
  return `${messageStart} with the following errors:\n${errorMessages.join(
    '\n\n'
  )}`;
}
