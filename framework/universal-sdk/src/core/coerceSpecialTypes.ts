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

function getType(type: string | string[] | undefined): string | undefined {
  if (Array.isArray(type)) return type[0];
  return type;
}

function getFormatsFromSchema(def: Record<string, string>): Set<string> {
  const formats = new Set<string>();
  if (!def) return formats;
  if (def.format) formats.add(def.format);

  for (const keyword of ['anyOf', 'oneOf']) {
    if (Array.isArray(def[keyword])) {
      for (const sub of def[keyword]) {
        if (sub && typeof sub === 'object') {
          if (sub.format) formats.add(sub.format);
        }
      }
    }
  }
  return formats;
}

function getTypeFromSchema(def: Record<string, string>): string | undefined {
  if (!def) return undefined;
  const t = getType(def.type);
  if (!t) {
    for (const keyword of ['anyOf', 'oneOf']) {
      if (Array.isArray(def[keyword])) {
        for (const sub of def[keyword]) {
          const subType = getType(sub.type);
          if (subType) return subType;
        }
      }
    }
  }
  return t;
}

function getSpecialFormat(def: Record<string, string>): string | undefined {
  const formats = getFormatsFromSchema(def);
  if (formats.has('date-time')) return 'date-time';
  if (formats.has('binary')) return 'binary';
  return undefined;
}

export function coerceSpecialTypes(
  input: Record<string, unknown>,
  schema: Record<string, unknown>
): unknown {
  const props = schema.properties || {};
  for (const [key, def] of Object.entries(props)) {
    if (!def) continue;
    const value = input[key];
    const type = getTypeFromSchema(def);

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
        const itemType = getTypeFromSchema(itemDef);
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
          const format = getSpecialFormat(itemDef);
          return handleSpecialString(item, format);
        }
        return item;
      });
      continue;
    }

    if (type === 'string') {
      const format = getSpecialFormat(def);
      input[key] = handleSpecialString(value, format);
    }
  }
  return input;
}
