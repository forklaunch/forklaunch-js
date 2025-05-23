export function safeParse<T = unknown>(input: string): T | string {
  try {
    return JSON.parse(input) as T;
  } catch {
    return input;
  }
}
