PRAGMA foreign_keys=OFF;

CREATE TABLE "new_CirviaMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cirviaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "mutedUntil" DATETIME,
  "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CirviaMember_cirviaId_fkey" FOREIGN KEY ("cirviaId") REFERENCES "Cirvia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CirviaMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CirviaMember_role_check" CHECK ("role" IN ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER')),
  CONSTRAINT "CirviaMember_status_check" CHECK ("status" IN ('PENDING', 'ACTIVE', 'BANNED', 'MUTED', 'REMOVED'))
);

INSERT INTO "new_CirviaMember" ("id","cirviaId","userId","role","status","mutedUntil","joinedAt","updatedAt")
SELECT "id","cirviaId","userId","role","status","mutedUntil","joinedAt","updatedAt" FROM "CirviaMember";

DROP TABLE "CirviaMember";
ALTER TABLE "new_CirviaMember" RENAME TO "CirviaMember";
CREATE INDEX "CirviaMember_cirviaId_idx" ON "CirviaMember"("cirviaId");
CREATE INDEX "CirviaMember_userId_idx" ON "CirviaMember"("userId");
CREATE UNIQUE INDEX "CirviaMember_cirviaId_userId_key" ON "CirviaMember"("cirviaId", "userId");

CREATE TABLE "new_IdentityScope" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "cirviaId" TEXT,
  "scope" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentityScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IdentityScope_cirviaId_fkey" FOREIGN KEY ("cirviaId") REFERENCES "Cirvia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_IdentityScope" ("id","userId","cirviaId","scope","createdAt")
SELECT "id","userId","cirviaId","scope","createdAt" FROM "IdentityScope";

DROP TABLE "IdentityScope";
ALTER TABLE "new_IdentityScope" RENAME TO "IdentityScope";
CREATE INDEX "IdentityScope_userId_idx" ON "IdentityScope"("userId");
CREATE INDEX "IdentityScope_cirviaId_idx" ON "IdentityScope"("cirviaId");
CREATE UNIQUE INDEX "IdentityScope_userId_cirviaId_scope_key" ON "IdentityScope"("userId", "cirviaId", "scope");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
