function handleSpecialString(v: unknown, format: string | undefined): unknown {
  if (typeof v !== 'string') return v;
  if (format === 'date-time') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d;
  }
  if (format === 'binary') {
    try {
      return Buffer.from(v, 'base64');
    } catch {
      throw new Error('Invalid base64 string');
    }
  }
  return v;
}

function getType(type: string | string[]): string | undefined {
  if (Array.isArray(type)) return type[0];
  return type;
}

export function coerceSpecialTypes(
  input: Record<string, unknown>,
  schema: Record<string, unknown>
): unknown {
  const props = schema.properties || {};
  for (const [key, def] of Object.entries(props)) {
    if (!def) continue;
    const value = input[key];
    const type = getType(def.type);

    if (
      type === 'object' &&
      def.properties &&
      typeof value === 'object' &&
      value !== null
    ) {
      input[key] = coerceSpecialTypes(
        value as Record<string, unknown>,
        def as Record<string, unknown>
      );
      continue;
    }

    if (type === 'array' && def.items && Array.isArray(value)) {
      input[key] = (value as unknown[]).map((item) => {
        const itemDef = def.items;
        const itemType = getType(itemDef.type);
        if (
          itemType === 'object' &&
          itemDef.properties &&
          typeof item === 'object' &&
          item !== null
        ) {
          return coerceSpecialTypes(
            item as Record<string, unknown>,
            itemDef as Record<string, unknown>
          );
        }
        if (itemType === 'string') {
          return handleSpecialString(item, itemDef.format);
        }
        return item;
      });
      continue;
    }

    if (type === 'string') {
      input[key] = handleSpecialString(value, def.format);
    }
  }
  return input;
}
