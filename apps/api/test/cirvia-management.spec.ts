import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
const Database = require('better-sqlite3');
import { existsSync, readFileSync, unlinkSync } from 'fs';
import * as jwt from 'jsonwebtoken';
import { join } from 'path';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { AuditLogService } from '../src/audit/audit-log.service';
import { NotificationService } from '../src/notifications/notification.service';

const dbPath = join(process.cwd(), 'test-cirvia.sqlite');

function token(userId: string, role = 'user') {
  return jwt.sign({ sub: userId, email: `${userId}@test.local`, role, type: 'access' }, 'access-secret', { expiresIn: '1h' });
}

describe('Cirvia management endpoints', () => {
  let app: INestApplication;
  let audit: AuditLogService;
  let notifications: NotificationService;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.DATABASE_URL = `file:${dbPath}`;

    if (existsSync(dbPath)) unlinkSync(dbPath);
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.exec(readFileSync(join(process.cwd(), 'prisma/migrations/20260214170000_cirvia_schema/migration.sql'), 'utf8'));
    db.exec(readFileSync(join(process.cwd(), 'prisma/migrations/20260215120000_cirvia_member_removed_and_global_identity/migration.sql'), 'utf8'));
    db.exec(readFileSync(join(process.cwd(), 'prisma/migrations/20260216100000_identity_scope_visibility_columns/migration.sql'), 'utf8'));
    db.exec(`
      INSERT INTO "User" ("id", "email") VALUES
      ('owner', 'owner@test.local'),
      ('admin', 'admin@test.local'),
      ('moderator', 'moderator@test.local'),
      ('member', 'member@test.local'),
      ('target', 'target@test.local'),
      ('joiner', 'joiner@test.local'),
      ('user-a', 'user-a@test.local'),
      ('user-b', 'user-b@test.local');
    `);
    db.close();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    audit = moduleRef.get(AuditLogService);
    notifications = moduleRef.get(NotificationService);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  it('supports create/discovery/invite/join/approve flow with audit + notifications', async () => {
    const auditSpy = jest.spyOn(audit, 'log');
    const notifyAdminsSpy = jest.spyOn(notifications, 'notifyCirviaAdmins');
    const notifyUserSpy = jest.spyOn(notifications, 'notifyUser');

    const create = await request(app.getHttpServer())
      .post('/cirvias')
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ name: 'Alpha Cirvia', description: 'desc', visibility: 'PUBLIC', requireApproval: true, maxMembers: 100 })
      .expect(201);

    expect(create.body.creatorIdentity.identityLevel).toBe('FULL');

    await request(app.getHttpServer())
      .get('/cirvias?page=1&pageSize=10&search=Alpha&joined=joined')
      .set('Authorization', `Bearer ${token('owner')}`)
      .expect(200);

    const cirviaId = create.body.id;

    const invite = await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/invites`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ expiresAt: new Date(Date.now() + 3600_000).toISOString(), maxUses: 2 })
      .expect(201);

    const join = await request(app.getHttpServer())
      .post('/cirvias/join')
      .set('Authorization', `Bearer ${token('joiner')}`)
      .send({ inviteCode: invite.body.inviteCode })
      .expect(201);

    expect(join.body.status).toBe('PENDING');
    expect(notifyAdminsSpy).toHaveBeenCalled();

    await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/members/joiner/approve`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .expect(201);

    expect(notifyUserSpy).toHaveBeenCalledWith('joiner', expect.objectContaining({ type: 'cirvia.membership.approved' }));
    expect(auditSpy).toHaveBeenCalledWith('cirvia.create', expect.objectContaining({ cirviaId }));
    expect(auditSpy).toHaveBeenCalledWith('cirvia.join', expect.objectContaining({ cirviaId, actorUserId: 'joiner' }));
  });

  it('enforces role authorization matrix and moderation transitions', async () => {
    const create = await request(app.getHttpServer())
      .post('/cirvias')
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ name: 'Beta Cirvia', description: 'desc', visibility: 'PRIVATE', requireApproval: false, maxMembers: 50 })
      .expect(201);

    const cirviaId = create.body.id;

    const invite = await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/invites`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ expiresAt: new Date(Date.now() + 3600_000).toISOString(), maxUses: 10 })
      .expect(201);

    for (const userId of ['admin', 'moderator', 'member', 'target']) {
      await request(app.getHttpServer())
        .post('/cirvias/join')
        .set('Authorization', `Bearer ${token(userId)}`)
        .send({ inviteCode: invite.body.inviteCode })
        .expect(201);
    }

    await request(app.getHttpServer())
      .put(`/cirvias/${cirviaId}/members/admin/role`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/cirvias/${cirviaId}/members/moderator/role`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ role: 'MODERATOR' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/cirvias/${cirviaId}/members/target/role`)
      .set('Authorization', `Bearer ${token('member')}`)
      .send({ role: 'ADMIN' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/members/target/mute`)
      .set('Authorization', `Bearer ${token('moderator')}`)
      .send({ duration: 30 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/members/target/unmute`)
      .set('Authorization', `Bearer ${token('moderator')}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/members/target/ban`)
      .set('Authorization', `Bearer ${token('admin')}`)
      .send({ reason: 'spam', duration: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/cirvias/${cirviaId}/members/target`)
      .set('Authorization', `Bearer ${token('admin')}`)
      .expect(200);
  });

  it('validates invite expired/maxUses/inactive', async () => {
    const create = await request(app.getHttpServer())
      .post('/cirvias')
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ name: 'Gamma Cirvia', description: 'desc', visibility: 'PUBLIC', requireApproval: false, maxMembers: 50 })
      .expect(201);

    const cirviaId = create.body.id;

    const expiredInvite = await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/invites`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ expiresAt: new Date(Date.now() - 1000).toISOString(), maxUses: 1 });

    expect([400, 201]).toContain(expiredInvite.status);
    if (expiredInvite.status === 201) {
      await request(app.getHttpServer())
        .post('/cirvias/join')
        .set('Authorization', `Bearer ${token('member')}`)
        .send({ inviteCode: expiredInvite.body.inviteCode })
        .expect(400);
    }

    const maxUsesInvite = await request(app.getHttpServer())
      .post(`/cirvias/${cirviaId}/invites`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ expiresAt: new Date(Date.now() + 3600_000).toISOString(), maxUses: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/cirvias/join')
      .set('Authorization', `Bearer ${token('member')}`)
      .send({ inviteCode: maxUsesInvite.body.inviteCode })
      .expect(201);

    await request(app.getHttpServer())
      .post('/cirvias/join')
      .set('Authorization', `Bearer ${token('target')}`)
      .send({ inviteCode: maxUsesInvite.body.inviteCode })
      .expect(400);

    const db = new Database(dbPath);
    db.exec(`UPDATE "CirviaInvite" SET "isActive" = 0 WHERE "inviteCode" = '${maxUsesInvite.body.inviteCode}'`);
    db.close();

    await request(app.getHttpServer())
      .post('/cirvias/join')
      .set('Authorization', `Bearer ${token('target')}`)
      .send({ inviteCode: maxUsesInvite.body.inviteCode })
      .expect(400);
  });

  it('resolves member identities by cirvia scope with global fallback', async () => {
    const cirviaOne = await request(app.getHttpServer())
      .post('/cirvias')
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ name: 'Delta Cirvia', description: 'desc', visibility: 'PUBLIC', requireApproval: false, maxMembers: 50 })
      .expect(201);

    const cirviaTwo = await request(app.getHttpServer())
      .post('/cirvias')
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ name: 'Epsilon Cirvia', description: 'desc', visibility: 'PUBLIC', requireApproval: false, maxMembers: 50 })
      .expect(201);

    const inviteOne = await request(app.getHttpServer())
      .post(`/cirvias/${cirviaOne.body.id}/invites`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ expiresAt: new Date(Date.now() + 3600_000).toISOString(), maxUses: 10 })
      .expect(201);

    const inviteTwo = await request(app.getHttpServer())
      .post(`/cirvias/${cirviaTwo.body.id}/invites`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .send({ expiresAt: new Date(Date.now() + 3600_000).toISOString(), maxUses: 10 })
      .expect(201);

    for (const userId of ['user-a', 'user-b']) {
      await request(app.getHttpServer())
        .post('/cirvias/join')
        .set('Authorization', `Bearer ${token(userId)}`)
        .send({ inviteCode: inviteOne.body.inviteCode })
        .expect(201);

      await request(app.getHttpServer())
        .post('/cirvias/join')
        .set('Authorization', `Bearer ${token(userId)}`)
        .send({ inviteCode: inviteTwo.body.inviteCode })
        .expect(201);
    }

    const db = new Database(dbPath);
    db.exec(`
      UPDATE "IdentityScope" SET "identityLevel" = 'ANONYMOUS'
      WHERE "userId" = 'user-a' AND "scope" = 'CIRVIA' AND "cirviaId" = '${cirviaOne.body.id}';
      UPDATE "IdentityScope" SET "identityLevel" = 'FULL', "showBio" = 1
      WHERE "userId" = 'user-a' AND "scope" = 'CIRVIA' AND "cirviaId" = '${cirviaTwo.body.id}';
      UPDATE "IdentityScope" SET "identityLevel" = 'PARTIAL', "showCity" = 1
      WHERE "userId" = 'user-a' AND "scope" = 'GLOBAL_DEFAULT';
    `);
    db.close();

    const membersInCirviaOne = await request(app.getHttpServer())
      .get(`/cirvias/${cirviaOne.body.id}/members`)
      .set('Authorization', `Bearer ${token('user-b')}`)
      .expect(200);

    const membersInCirviaTwo = await request(app.getHttpServer())
      .get(`/cirvias/${cirviaTwo.body.id}/members`)
      .set('Authorization', `Bearer ${token('user-b')}`)
      .expect(200);

    const userAInOne = membersInCirviaOne.body.find((member: any) => member.userId === 'user-a');
    const userAInTwo = membersInCirviaTwo.body.find((member: any) => member.userId === 'user-a');

    expect(userAInOne.identity.identityLevel).toBe('ANONYMOUS');
    expect(userAInTwo.identity.identityLevel).toBe('FULL');

    const dbUpdate = new Database(dbPath);
    dbUpdate.exec(`
      UPDATE "IdentityScope" SET "identityLevel" = 'ANONYMOUS'
      WHERE "userId" = 'user-a' AND "scope" = 'CIRVIA' AND "cirviaId" = '${cirviaOne.body.id}';
    `);
    dbUpdate.close();

    const stillFullInTwo = await request(app.getHttpServer())
      .get(`/cirvias/${cirviaTwo.body.id}/members`)
      .set('Authorization', `Bearer ${token('user-b')}`)
      .expect(200);

    const userAAfterUpdate = stillFullInTwo.body.find((member: any) => member.userId === 'user-a');
    expect(userAAfterUpdate.identity.identityLevel).toBe('FULL');

    const dbFallback = new Database(dbPath);
    dbFallback.exec(`
      DELETE FROM "IdentityScope"
      WHERE "userId" = 'user-a' AND "scope" = 'CIRVIA' AND "cirviaId" = '${cirviaOne.body.id}';
    `);
    dbFallback.close();

    const fallbackMembers = await request(app.getHttpServer())
      .get(`/cirvias/${cirviaOne.body.id}/members`)
      .set('Authorization', `Bearer ${token('user-b')}`)
      .expect(200);

    const userAWithFallback = fallbackMembers.body.find((member: any) => member.userId === 'user-a');
    expect(userAWithFallback.identity.identityLevel).toBe('PARTIAL');
  });
});
