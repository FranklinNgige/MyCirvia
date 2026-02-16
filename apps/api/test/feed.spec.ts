import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
const Database = require('better-sqlite3');
import { existsSync, readFileSync, unlinkSync } from 'fs';
const jwt = require('jsonwebtoken');
import { join } from 'path';
const request = require('supertest');
import { AppModule } from '../src/app.module';

const dbPath = join(process.cwd(), 'test-feed.sqlite');

function token(userId: string, role = 'user') {
  return jwt.sign({ sub: userId, email: `${userId}@test.local`, role, type: 'access' }, 'access-secret', { expiresIn: '1h' });
}

describe('Feed endpoints', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.DATABASE_URL = `file:${dbPath}`;

    if (existsSync(dbPath)) unlinkSync(dbPath);
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    const migrations = [
      '20260214170000_cirvia_schema',
      '20260215120000_cirvia_member_removed_and_global_identity',
      '20260216100000_identity_scope_visibility_columns',
      '20260217090000_posts_comments_interactions',
    ];
    for (const migration of migrations) {
      db.exec(readFileSync(join(process.cwd(), `prisma/migrations/${migration}/migration.sql`), 'utf8'));
    }

    db.exec(`
      INSERT INTO "User" ("id", "email") VALUES
      ('owner', 'owner@test.local'),
      ('author', 'author@test.local'),
      ('member', 'member@test.local'),
      ('outsider', 'outsider@test.local'),
      ('muted', 'muted@test.local');

      INSERT INTO "Cirvia" ("id", "name", "description", "visibility", "requireApproval", "maxMembers", "createdById", "createdAt", "updatedAt") VALUES
      ('c1', 'Feed Cirvia One', 'desc', 'PUBLIC', 0, 100, 'owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('c2', 'Feed Cirvia Two', 'desc', 'PUBLIC', 0, 100, 'owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

      INSERT INTO "CirviaMember" ("id", "cirviaId", "userId", "role", "status", "joinedAt", "updatedAt") VALUES
      ('m-owner-1', 'c1', 'owner', 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('m-author-1', 'c1', 'author', 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('m-member-1', 'c1', 'member', 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('m-muted-1', 'c1', 'muted', 'MEMBER', 'MUTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('m-owner-2', 'c2', 'owner', 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('m-author-2', 'c2', 'author', 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('m-member-2', 'c2', 'member', 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

      INSERT INTO "IdentityScope" ("id", "userId", "cirviaId", "scope", "identityLevel", "showAgeRange", "showGender", "showCity", "showState", "showBio", "showProfilePhoto", "customAvatarKey", "createdAt") VALUES
      ('scope-global-author', 'author', NULL, 'GLOBAL_DEFAULT', 'ANONYMOUS', 0, 0, 0, 0, 0, 0, NULL, CURRENT_TIMESTAMP),
      ('scope-c1-author', 'author', 'c1', 'CIRVIA', 'ANONYMOUS', 0, 0, 0, 0, 0, 0, NULL, CURRENT_TIMESTAMP),
      ('scope-c2-author', 'author', 'c2', 'CIRVIA', 'ANONYMOUS', 0, 0, 0, 0, 0, 0, NULL, CURRENT_TIMESTAMP);
    `);
    db.close();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  it('supports post/comment CRUD and like idempotency', async () => {
    const createdPost = await request(app.getHttpServer())
      .post('/cirvias/c1/posts')
      .set('Authorization', `Bearer ${token('author')}`)
      .send({ contentText: 'hello feed', mediaKeys: ['s3/a.png'] })
      .expect(201);

    const postId = createdPost.body.post.id;

    await request(app.getHttpServer())
      .post(`/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(201);

    const likeAgain = await request(app.getHttpServer())
      .post(`/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(201);

    expect(likeAgain.body.likeCount).toBe(1);

    await request(app.getHttpServer())
      .delete(`/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(200);

    const unlikeAgain = await request(app.getHttpServer())
      .delete(`/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(200);

    expect(unlikeAgain.body.likeCount).toBe(0);

    const feed = await request(app.getHttpServer())
      .get('/cirvias/c1/posts?limit=10')
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(200);

    expect(feed.body.items).toHaveLength(1);
    expect(feed.body.items[0].post.id).toBe(postId);

    const createdComment = await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token('member')}`)
      .send({ contentText: 'root comment' })
      .expect(201);

    const commentId = createdComment.body.comment.id;

    await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token('author')}`)
      .send({ contentText: 'reply', parentCommentId: commentId })
      .expect(201);

    const comments = await request(app.getHttpServer())
      .get(`/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(200);

    expect(comments.body.items).toHaveLength(1);
    expect(comments.body.items[0].replies).toHaveLength(1);

    await request(app.getHttpServer())
      .put(`/posts/${postId}`)
      .set('Authorization', `Bearer ${token('author')}`)
      .send({ contentText: 'updated' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/comments/${commentId}`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/posts/${postId}`)
      .set('Authorization', `Bearer ${token('owner')}`)
      .expect(200);
  });

  it('enforces membership and muted authorization', async () => {
    await request(app.getHttpServer())
      .get('/cirvias/c1/posts')
      .set('Authorization', `Bearer ${token('outsider')}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/cirvias/c1/posts')
      .set('Authorization', `Bearer ${token('muted')}`)
      .send({ contentText: 'cannot post' })
      .expect(403);
  });

  it('resolves identity scoped by cirvia', async () => {
    const db = new Database(dbPath);
    db.exec(`
      UPDATE "IdentityScope" SET "identityLevel" = 'ANONYMOUS'
      WHERE "userId" = 'author' AND "scope" = 'CIRVIA' AND "cirviaId" = 'c1';

      UPDATE "IdentityScope" SET "identityLevel" = 'FULL', "showBio" = 1
      WHERE "userId" = 'author' AND "scope" = 'CIRVIA' AND "cirviaId" = 'c2';
    `);
    db.close();

    const c1Post = await request(app.getHttpServer())
      .post('/cirvias/c1/posts')
      .set('Authorization', `Bearer ${token('author')}`)
      .send({ contentText: 'in c1' })
      .expect(201);

    const c2Post = await request(app.getHttpServer())
      .post('/cirvias/c2/posts')
      .set('Authorization', `Bearer ${token('author')}`)
      .send({ contentText: 'in c2' })
      .expect(201);

    const c1PostView = await request(app.getHttpServer())
      .get(`/posts/${c1Post.body.post.id}`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(200);

    const c2PostView = await request(app.getHttpServer())
      .get(`/posts/${c2Post.body.post.id}`)
      .set('Authorization', `Bearer ${token('member')}`)
      .expect(200);

    expect(c1PostView.body.author.identityLevel).toBe('ANONYMOUS');
    expect(c2PostView.body.author.identityLevel).toBe('FULL');
  });
});
