function sanitizeError(error: Error, seen: WeakSet<object>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }

  for (const key of Object.getOwnPropertyNames(error)) {
    if (key === 'name' || key === 'message' || key === 'stack') {
      continue
    }

    base[key] = sanitizeLogValue((error as unknown as Record<string, unknown>)[key], seen)
  }

  return base
}

export function sanitizeLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    if (seen.has(value)) {
      return '[Circular]'
    }

    seen.add(value)
    return sanitizeError(value, seen)
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]'
    }

    seen.add(value)
    const result = value.map((item) => sanitizeLogValue(item, seen))
    seen.delete(value)
    return result
  }

  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) {
      return '[Circular]'
    }

    seen.add(value)

    const result = Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeLogValue(nestedValue, seen)])
    )

    seen.delete(value)
    return result
  }

  return value
}

export function serializeLogMeta(meta: Record<string, unknown>): string {
  return JSON.stringify(sanitizeLogValue(meta), null, 2)
}
