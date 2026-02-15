-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Cirvia" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "visibility" TEXT NOT NULL,
  "requireApproval" BOOLEAN NOT NULL DEFAULT true,
  "maxMembers" INTEGER,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME,
  CONSTRAINT "Cirvia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Cirvia_name_length_check" CHECK (length("name") BETWEEN 3 AND 50),
  CONSTRAINT "Cirvia_description_length_check" CHECK (length("description") <= 500),
  CONSTRAINT "Cirvia_visibility_check" CHECK ("visibility" IN ('PUBLIC', 'PRIVATE')),
  CONSTRAINT "Cirvia_maxMembers_check" CHECK ("maxMembers" IS NULL OR "maxMembers" > 0)
);

-- CreateTable
CREATE TABLE "CirviaMember" (
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
  CONSTRAINT "CirviaMember_status_check" CHECK ("status" IN ('PENDING', 'ACTIVE', 'BANNED', 'MUTED'))
);

-- CreateTable
CREATE TABLE "CirviaInvite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cirviaId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "maxUses" INTEGER,
  "usesCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CirviaInvite_cirviaId_fkey" FOREIGN KEY ("cirviaId") REFERENCES "Cirvia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CirviaInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CirviaInvite_code_length_check" CHECK (length("inviteCode") = 8),
  CONSTRAINT "CirviaInvite_usesCount_check" CHECK ("usesCount" >= 0),
  CONSTRAINT "CirviaInvite_maxUses_check" CHECK ("maxUses" IS NULL OR "maxUses" > 0)
);

-- CreateTable
CREATE TABLE "CirviaChat" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cirviaId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CirviaChat_cirviaId_fkey" FOREIGN KEY ("cirviaId") REFERENCES "Cirvia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdentityScope" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "cirviaId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentityScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IdentityScope_cirviaId_fkey" FOREIGN KEY ("cirviaId") REFERENCES "Cirvia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Cirvia_name_key" ON "Cirvia"("name");
CREATE INDEX "CirviaMember_cirviaId_idx" ON "CirviaMember"("cirviaId");
CREATE INDEX "CirviaMember_userId_idx" ON "CirviaMember"("userId");
CREATE UNIQUE INDEX "CirviaMember_cirviaId_userId_key" ON "CirviaMember"("cirviaId", "userId");
CREATE UNIQUE INDEX "CirviaInvite_inviteCode_key" ON "CirviaInvite"("inviteCode");
CREATE INDEX "CirviaInvite_cirviaId_idx" ON "CirviaInvite"("cirviaId");
CREATE INDEX "CirviaInvite_inviteCode_idx" ON "CirviaInvite"("inviteCode");
CREATE UNIQUE INDEX "CirviaChat_cirviaId_key" ON "CirviaChat"("cirviaId");
CREATE INDEX "IdentityScope_userId_idx" ON "IdentityScope"("userId");
CREATE INDEX "IdentityScope_cirviaId_idx" ON "IdentityScope"("cirviaId");
CREATE UNIQUE INDEX "IdentityScope_userId_cirviaId_scope_key" ON "IdentityScope"("userId", "cirviaId", "scope");
