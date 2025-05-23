import { generateStringFromRegex } from './regex';

/**
 * Extracts the SDK path from the given path.
 *
 * @param {string | RegExp | (string | RegExp)[]} path - The provided path.
 * @returns {string} - The extracted SDK path.
 * @throws {Error} - Throws an error if the path is not defined.
 */
export function getSdkPath(
  path: string | RegExp | (string | RegExp)[]
): string {
  let sdkPath = path;

  if (Array.isArray(path)) {
    sdkPath = path.pop() || path[0];
  }

  if (!sdkPath) {
    throw new Error('Path is not defined');
  }

  if (sdkPath instanceof RegExp) {
    sdkPath = generateStringFromRegex(sdkPath);
  }

  return sdkPath as string;
}
