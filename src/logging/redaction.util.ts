const FULL_REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'oldPassword',
  'token',
  'accessToken',
  'refreshToken',
  'verificationToken',
  'resetToken',
  'realName',
  'chosenName',
]);

const S3_SAFE_KEYS = new Set(['profilePhotoKey', 'avatarKey']);

function redactEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const localPrefix = local.slice(0, 2);
  return `${localPrefix}***@${domain}`;
}

export function redactSensitiveData<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((value) => redactSensitiveData(value)) as T;
  if (typeof input !== 'object') return input;

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (FULL_REDACT_KEYS.has(key)) {
      output[key] = '[REDACTED]';
      continue;
    }

    if (key === 'email' && typeof value === 'string') {
      output[key] = redactEmail(value);
      continue;
    }

    if ((key.endsWith('Secret') || key.endsWith('Key')) && !S3_SAFE_KEYS.has(key)) {
      output[key] = '[REDACTED]';
      continue;
    }

    output[key] = redactSensitiveData(value);
  }

  return output as T;
}
