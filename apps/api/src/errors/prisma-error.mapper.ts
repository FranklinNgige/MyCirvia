const prismaCodeMap: Record<string, string> = {
  P2002: 'Email already in use',
  P2025: 'Record not found',
};

export function mapPrismaError(error: { code?: string; message?: string }): string | undefined {
  if (!error?.code) return undefined;
  return prismaCodeMap[error.code];
}
