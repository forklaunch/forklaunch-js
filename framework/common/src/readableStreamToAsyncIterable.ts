export async function* readableStreamToAsyncIterable<T>(
  stream: ReadableStream<T>
): AsyncIterable<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      yield value!;
    }
  } finally {
    reader.releaseLock();
  }
}
