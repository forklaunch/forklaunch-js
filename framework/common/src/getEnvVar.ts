/**
 * Gets an environment variable and casts it to a string.
 *
 * It casts a potentially undefined value to a string, since it will be validated
 * in order to be bootstrapped.
 *
 * @param name - The name of the environment variable to retrieve
 * @returns The environment variable value as a string
 */
export function getEnvVar(name: string): string {
  const value = process.env[name];
  return value as string;
}
