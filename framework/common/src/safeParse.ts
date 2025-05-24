export function safeParse<T>(input: unknown): T {
  try {
    return JSON.parse(input as string) as T;
  } catch {
    return input as T;
  }
}
