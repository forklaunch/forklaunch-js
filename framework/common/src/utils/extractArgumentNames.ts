/**
 * Extracts the names of arguments from a function's string representation.
 * This is useful for reflection and debugging purposes.
 *
 * @param {Object} func - A function or object with a toString method that returns the function definition
 * @returns {string[]} An array of argument names
 * @example
 * function example(a, b, { c, d }) {}
 * const names = extractArgumentNames(example);
 * // Result: ['a', 'b', '{c,d}']
 */
export function extractArgumentNames(func: { toString(): string }): string[] {
  const fnStr = func.toString();
  const args = fnStr.match(/\(([^)]*)\)/);
  if (!args) return [];

  const argsStr = args[1];
  const result = [];
  let currentArg = '';
  let braceCount = 0;

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];

    if (char === '{') braceCount++;
    if (char === '}') braceCount--;

    if (char === ',' && braceCount === 0) {
      result.push(currentArg.trim());
      currentArg = '';
    } else {
      if (char === ' ' || char === '\n' || char === '\t' || char === '\r')
        continue;
      currentArg += char;
    }
  }

  if (currentArg) {
    result.push(currentArg.trim());
  }

  return result;
}
