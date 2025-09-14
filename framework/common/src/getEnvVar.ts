// This is a simple function that returns the value of an environment variable.
// Returns undefined if the environment variable doesn't exist or if not in a Node.js environment.

export function getEnvVar(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  if (typeof import.meta !== 'undefined' && 'env' in import.meta) {
    const env = (
      import.meta as unknown as { env: Record<string, string | undefined> }
    ).env;
    return env[name];
  }

  return undefined;
}
