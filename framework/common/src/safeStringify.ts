/**
 * Safely stringifies any JavaScript value, handling special cases like:
 * - Circular references
 * - Error objects
 * - BigInt
 * - Functions
 * - Symbols
 * - Special number values (NaN, Infinity)
 * - Built-in objects (Date, RegExp)
 * - Collections (Map, Set)
 * - TypedArrays and ArrayBuffers
 *
 * @param arg - The value to stringify
 * @returns A string representation of the value
 *
 * @example
 * ```typescript
 * // Handle circular references
 * const circular = { a: 1 };
 * circular.self = circular;
 * safeStringify(circular); // '{"a":1,"self":"[Circular Reference]"}'
 *
 * // Handle Error objects
 * safeStringify(new Error("test")); // '{"name":"Error","message":"test","stack":"..."}'
 *
 * // Handle special types
 * safeStringify(BigInt(123)); // "123n"
 * safeStringify(Symbol("test")); // "Symbol(test)"
 * safeStringify(() => {}); // "[Function: anonymous]"
 * safeStringify(new Map([["key", "value"]])); // '{"__type":"Map","value":[["key","value"]]}'
 * ```
 */
export function safeStringify(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }

  // Handle null/undefined
  if (arg == null) {
    return String(arg);
  }

  // Track seen objects for circular reference detection
  const seen = new WeakSet();

  const replacer = (key: string, value: unknown): unknown => {
    // Handle circular references
    if (value && typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }

    // Handle Error objects
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
        cause: value.cause
      };
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }

    // Handle Functions
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    // Handle Symbols
    if (typeof value === 'symbol') {
      return value.toString();
    }

    // Handle special number values
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return 'NaN';
      if (value === Infinity) return 'Infinity';
      if (value === -Infinity) return '-Infinity';
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle RegExp
    if (value instanceof RegExp) {
      return value.toString();
    }

    // Handle Map
    if (value instanceof Map) {
      return {
        __type: 'Map',
        value: Array.from(value.entries())
      };
    }

    // Handle Set
    if (value instanceof Set) {
      return {
        __type: 'Set',
        value: Array.from(value.values())
      };
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(value)) {
      return {
        __type: value.constructor.name,
        value: Array.from(value as unknown as ArrayLike<unknown>)
      };
    }

    // Handle ArrayBuffer
    if (value instanceof ArrayBuffer) {
      return {
        __type: 'ArrayBuffer',
        value: Array.from(new Uint8Array(value))
      };
    }

    return value;
  };

  try {
    return JSON.stringify(arg, replacer);
  } catch (error: unknown) {
    // Fallback for any unexpected serialization errors
    if (error instanceof Error) {
      return `[Unserializable: ${error.message}]`;
    }
    return '[Unserializable: Unknown error]';
  }
}
