// It casts a potentially undefined value to a string, since it will be validated in order to be bootstrapped.

export function getEnvVar(name: string): string {
  const value = process.env[name];
  return value as string;
}
