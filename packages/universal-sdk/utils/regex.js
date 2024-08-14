/**
 * Generates a string from a given regular expression or string representation of a regex.
 *
 * @param {RegExp | string} regex - The regular expression or string representation of a regex.
 * @returns {string} - The generated string based on the regex pattern.
 * @throws {Error} - Throws an error if there are unmatched brackets or groups.
 */
export function generateStringFromRegex(regex) {
    let regexStr = typeof regex === 'object' ? regex.source : regex;
    // Remove leading and trailing slashes if present
    if (regexStr.startsWith('/'))
        regexStr = regexStr.slice(1);
    if (regexStr.endsWith('/g'))
        regexStr = regexStr.slice(0, -2); // Remove the global flag
    if (regexStr.endsWith('/'))
        regexStr = regexStr.slice(0, -1);
    let result = '';
    let i = 0;
    while (i < regexStr.length) {
        const char = regexStr[i];
        switch (char) {
            case '\\': {
                // Handle escaped characters
                const nextChar = regexStr[i + 1];
                switch (nextChar) {
                    case 'b':
                        // Word boundary, ensure we start a new word
                        if (result.length > 0 && /\w/.test(result[result.length - 1])) {
                            result += ' ';
                        }
                        break;
                    case 'd':
                        result += '0'; // Match a digit
                        break;
                    case 'w':
                        result += 'a'; // Match a word character
                        break;
                    case 's':
                        result += ' '; // Match a whitespace character
                        break;
                    default:
                        result += nextChar;
                }
                i += 2;
                break;
            }
            case '.':
                // Match any character (using 'a' for simplicity)
                result += 'a';
                i++;
                break;
            case '[': {
                // Handle character classes
                const endIdx = regexStr.indexOf(']', i);
                if (endIdx === -1) {
                    throw new Error('Unmatched [');
                }
                const charClass = regexStr.slice(i + 1, endIdx);
                result += charClass[0]; // Use the first character in the class
                i = endIdx + 1;
                break;
            }
            case '(': {
                // Handle groups (non-capturing groups (?:...) are simplified to normal groups)
                const endGroupIdx = regexStr.indexOf(')', i);
                if (endGroupIdx === -1) {
                    throw new Error('Unmatched (');
                }
                const groupContent = regexStr.slice(i + 1, endGroupIdx);
                result += generateStringFromRegex(groupContent); // Recursively handle group content
                i = endGroupIdx + 1;
                break;
            }
            case '{': {
                // Handle quantifiers {n} or {n,m}
                const endQuantIdx = regexStr.indexOf('}', i);
                if (endQuantIdx === -1) {
                    throw new Error('Unmatched {');
                }
                const quantifier = regexStr.slice(i + 1, endQuantIdx);
                const min = parseInt(quantifier.split(',')[0], 10) || 1;
                const lastChar = result[result.length - 1];
                result += lastChar.repeat(min - 1);
                i = endQuantIdx + 1;
                break;
            }
            case '*':
            case '+':
            case '?': {
                // Handle *, +, and ? quantifiers (simplified handling)
                const prevChar = result[result.length - 1];
                if (char === '*') {
                    // Match zero or more (using one for simplicity)
                    result += prevChar;
                }
                else if (char === '+') {
                    // Match one or more (already have one, so add one more)
                    result += prevChar;
                }
                i++;
                break;
            }
            default:
                // Default case: add character to result
                result += char;
                i++;
                break;
        }
    }
    return result;
}
