// This is a simple function that returns the value of an environment variable.
// It casts a potentially undefined value to a string, since it will be validated in order to be bootstrapped.

export function getEnvVar(name: string): string {
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[name];
    return value as string;
  }

  return '';
}
