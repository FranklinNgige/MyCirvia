const PROFILE_FIELDS = new Set([
  'realName',
  'chosenName',
  'abstractName',
  'abstractAvatarKey',
  'profilePhotoKey',
  'ageRange',
  'gender',
  'city',
  'state',
  'bio',
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(record)) {
    if (PROFILE_FIELDS.has(key)) {
      continue;
    }

    sanitized[key] = sanitizeValue(fieldValue);
  }

  return sanitized;
}

export function stripProfileFieldsMiddleware(_req: unknown, res: { json: (body: unknown) => unknown }, next: () => void): void {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => originalJson(sanitizeValue(body));
  next();
}
