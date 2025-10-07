/**
 * Deep clones an object while removing all undefined values.
 * Preserves methods, getters/setters, non-enumerable properties, symbols, and prototype chains.
 * @param {unknown} obj - The object to clone.
 * @param {WeakMap} seen - Map to track circular references.
 * @returns {unknown} The cloned object without undefined values.
 */
export function deepCloneWithoutUndefined<T>(obj: T, seen = new WeakMap()): T {
  // Handle primitives and null
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj as object)) {
    return seen.get(obj as object);
  }

  // Handle built-in types
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }
  if (obj instanceof Map) {
    const clonedMap = new Map();
    seen.set(obj as object, clonedMap);
    obj.forEach((value, key) => {
      if (value !== undefined) {
        clonedMap.set(key, deepCloneWithoutUndefined(value, seen));
      }
    });
    return clonedMap as T;
  }
  if (obj instanceof Set) {
    const clonedSet = new Set();
    seen.set(obj as object, clonedSet);
    obj.forEach((value) => {
      if (value !== undefined) {
        clonedSet.add(deepCloneWithoutUndefined(value, seen));
      }
    });
    return clonedSet as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const clonedArray: unknown[] = [];
    seen.set(obj as object, clonedArray);
    for (const item of obj) {
      if (item !== undefined) {
        clonedArray.push(deepCloneWithoutUndefined(item, seen));
      }
    }
    return clonedArray as T;
  }

  // Handle functions (return as-is since they're immutable references)
  if (typeof obj === 'function') {
    return obj;
  }

  // Handle objects (including class instances)
  const proto = Object.getPrototypeOf(obj);
  const cloned = Object.create(proto) as T;
  seen.set(obj as object, cloned);

  // Clone all own properties (including non-enumerable and symbol-keyed)
  const allKeys = [
    ...Object.getOwnPropertyNames(obj),
    ...Object.getOwnPropertySymbols(obj)
  ];

  for (const key of allKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (!descriptor) continue;

    // Handle data descriptors
    if ('value' in descriptor) {
      if (descriptor.value !== undefined) {
        Object.defineProperty(cloned, key, {
          ...descriptor,
          value: deepCloneWithoutUndefined(descriptor.value, seen)
        });
      }
    }
    // Handle accessor descriptors (getters/setters)
    else {
      Object.defineProperty(cloned, key, descriptor);
    }
  }

  return cloned;
}
