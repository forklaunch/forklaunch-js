export function extractArgumentNames(func: { toString(): string }): string[] {
  const fnStr = func.toString();

  const args = fnStr.match(/\(([^)]*)\)/);

  if (!args) return [];

  return args[1].split(',').map((arg) => arg.trim());
}
