import { readFileSync } from 'node:fs';
const Database = require('better-sqlite3');

const migrationSql = readFileSync('prisma/migrations/20260214170000_cirvia_schema/migration.sql', 'utf8');

function createDb() {
  const db = new Database(':memory:');
  db.exec(migrationSql);
  db.exec(`
    INSERT INTO "User" ("id", "email") VALUES
      ('u-1', 'one@test.local'),
      ('u-2', 'two@test.local');
  `);
  return db;
}

describe('Cirvia schema constraints', () => {
  it('enforces unique and length constraints on cirvia', () => {
    const db = createDb();

    db.exec(`
      INSERT INTO "Cirvia" ("id", "name", "description", "visibility", "createdById", "updatedAt")
      VALUES ('c-1', 'Constraint Test Cirvia', 'valid', 'PUBLIC', 'u-1', CURRENT_TIMESTAMP);
    `);

    expect(() =>
      db.exec(`
        INSERT INTO "Cirvia" ("id", "name", "description", "visibility", "createdById", "updatedAt")
        VALUES ('c-2', 'Constraint Test Cirvia', 'duplicate', 'PRIVATE', 'u-1', CURRENT_TIMESTAMP);
      `)
    ).toThrow();

    expect(() =>
      db.exec(`
        INSERT INTO "Cirvia" ("id", "name", "description", "visibility", "createdById", "updatedAt")
        VALUES ('c-3', 'aa', 'too short', 'PUBLIC', 'u-1', CURRENT_TIMESTAMP);
      `)
    ).toThrow();
  });

  it('supports soft delete via deletedAt timestamp', () => {
    const db = createDb();

    db.exec(`
      INSERT INTO "Cirvia" ("id", "name", "description", "visibility", "createdById", "updatedAt")
      VALUES ('c-soft', 'Soft Delete Cirvia', 'to soft delete', 'PRIVATE', 'u-2', CURRENT_TIMESTAMP);
      UPDATE "Cirvia" SET "deletedAt" = CURRENT_TIMESTAMP WHERE "id" = 'c-soft';
    `);

    const activeCount = db
      .prepare('SELECT COUNT(*) AS count FROM "Cirvia" WHERE "id" = ? AND "deletedAt" IS NULL')
      .get('c-soft') as { count: number };
    const allCount = db.prepare('SELECT COUNT(*) AS count FROM "Cirvia" WHERE "id" = ?').get('c-soft') as {
      count: number;
    };

    expect(activeCount.count).toBe(0);
    expect(allCount.count).toBe(1);
  });

  it('enforces invite code uniqueness', () => {
    const db = createDb();

    db.exec(`
      INSERT INTO "Cirvia" ("id", "name", "description", "visibility", "createdById", "updatedAt")
      VALUES ('c-invite', 'Invite Uniqueness Cirvia', 'testing invites', 'PRIVATE', 'u-1', CURRENT_TIMESTAMP);

      INSERT INTO "CirviaInvite" ("id", "cirviaId", "inviteCode", "createdById", "expiresAt")
      VALUES ('i-1', 'c-invite', 'AB12CD34', 'u-1', DATETIME('now', '+1 day'));
    `);

    expect(() =>
      db.exec(`
        INSERT INTO "CirviaInvite" ("id", "cirviaId", "inviteCode", "createdById", "expiresAt")
        VALUES ('i-2', 'c-invite', 'AB12CD34', 'u-2', DATETIME('now', '+2 day'));
      `)
    ).toThrow();
  });
});
