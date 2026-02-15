import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
const jwt = require('jsonwebtoken');
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { redactSensitiveData } from '../src/logging/redaction.util';

describe('Security infrastructure', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('protected route requires JWT', async () => {
    await request(app.getHttpServer()).get('/protected').expect(401);
  });

  it('invalid JWT rejected', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('role guard blocks unauthorized roles', async () => {
    const token = jwt.sign(
      { sub: 'u1', email: 'user@example.com', role: 'user', type: 'access' },
      'access-secret',
      { expiresIn: '10m' },
    );

    await request(app.getHttpServer())
      .get('/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('sensitive data redacted in logs', () => {
    const redacted = redactSensitiveData({
      password: 'secret',
      token: 'abc',
      email: 'private@example.com',
      nestedSecret: 'dontlog',
      profilePhotoKey: 'avatars/x.png',
    });

    expect(redacted).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      email: 'pr***@example.com',
      nestedSecret: '[REDACTED]',
      profilePhotoKey: 'avatars/x.png',
    });
  });

  it("error responses don't leak details", async () => {
    const token = jwt.sign(
      { sub: 'u1', email: 'admin@example.com', role: 'admin', type: 'access' },
      'access-secret',
      { expiresIn: '10m' },
    );

    const res = await request(app.getHttpServer())
      .get('/error')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);

    expect(res.body.message).toBe('Email already in use');
    expect(JSON.stringify(res.body)).not.toContain('unique constraint violation');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });
});
