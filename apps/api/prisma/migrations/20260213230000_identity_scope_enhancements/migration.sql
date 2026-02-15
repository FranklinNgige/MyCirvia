-- Add default behavior + lookup index for identity scope tuples.
ALTER TABLE "IdentityScope"
  ALTER COLUMN "scopeType" SET DEFAULT 'GLOBAL_DEFAULT',
  ALTER COLUMN "scopeId" SET DEFAULT 'GLOBAL_DEFAULT',
  ALTER COLUMN "identityLevel" SET DEFAULT 'ANONYMOUS',
  ALTER COLUMN "showAgeRange" SET DEFAULT false,
  ALTER COLUMN "showGender" SET DEFAULT false,
  ALTER COLUMN "showProfilePhoto" SET DEFAULT false,
  ALTER COLUMN "showRealName" SET DEFAULT false;

CREATE INDEX IF NOT EXISTS "IdentityScope_userId_scopeType_scopeId_idx"
  ON "IdentityScope"("userId", "scopeType", "scopeId");

CREATE UNIQUE INDEX IF NOT EXISTS "IdentityScope_userId_scopeType_scopeId_key"
  ON "IdentityScope"("userId", "scopeType", "scopeId");
