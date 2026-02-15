const request = require('supertest');
const { createApp } = require('../src/app');

function seedStore(store) {
  store.users.set('u1', { id: 'u1', profile: { chosenName: 'Comet', realName: 'Alice Example' } });
  store.users.set('u2', { id: 'u2', profile: { chosenName: 'Nova', realName: 'Bob Example' } });
  store.cirvias.set('c1', { id: 'c1', name: 'Cirvia One', members: ['u1'] });
  store.chats.set('t1', {
    id: 't1',
    participants: ['u1', 'u2'],
    participantNames: ['Comet', 'Nova'],
  });
}

describe('identity scope management endpoints', () => {
  let app;
  let store;
  let events;

  beforeEach(() => {
    events = [];
    app = createApp({ websocket: { emit: (...args) => events.push(args) } });
    store = app.locals.store;
    seedStore(store);
  });

  test('CRUD operations for scopes', async () => {
    const global = await request(app)
      .put('/identity/scopes/global-default')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'PARTIAL', showAgeRange: true, showGender: true });
    expect(global.status).toBe(200);

    const cirvia = await request(app)
      .put('/identity/scopes/cirvia/c1')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'FULL', showRealName: true, showProfilePhoto: true });
    expect(cirvia.status).toBe(200);

    const chat = await request(app)
      .put('/identity/scopes/chat/t1')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'ANONYMOUS', showAgeRange: true, showGender: true });
    expect(chat.status).toBe(200);

    const list = await request(app).get('/identity/scopes').set('x-user-id', 'u1');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(3);
    expect(list.body.find((s) => s.scopeType === 'CIRVIA').cirviaName).toBe('Cirvia One');
    expect(list.body.find((s) => s.scopeType === 'CHAT').chatParticipantNames).toEqual(['Comet', 'Nova']);

    const defaultGet = await request(app).get('/identity/scopes/global-default').set('x-user-id', 'u1');
    expect(defaultGet.status).toBe(200);
    expect(defaultGet.body.scopeType).toBe('GLOBAL_DEFAULT');

    const del = await request(app)
      .delete(`/identity/scopes/${cirvia.body.id}`)
      .set('x-user-id', 'u1');
    expect(del.status).toBe(200);
    expect(del.body.fallbackScopeId).toBe(global.body.id);
  });

  test('validation rules enforced', async () => {
    const badAnon = await request(app)
      .put('/identity/scopes/global-default')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'ANONYMOUS', showRealName: true });
    expect(badAnon.status).toBe(400);

    const badPartial = await request(app)
      .put('/identity/scopes/global-default')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'PARTIAL', showProfilePhoto: true });
    expect(badPartial.status).toBe(400);

    store.users.get('u1').profile = { chosenName: 'john', realName: 'Alice' };
    const commonName = await request(app)
      .put('/identity/scopes/global-default')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'PARTIAL' });
    expect(commonName.status).toBe(400);
  });

  test('scope isolation and authorization', async () => {
    const global = await request(app)
      .put('/identity/scopes/global-default')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'PARTIAL', showAgeRange: true });
    const cirvia = await request(app)
      .put('/identity/scopes/cirvia/c1')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'FULL', showRealName: true });

    await request(app)
      .put('/identity/scopes/cirvia/c1')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'ANONYMOUS', showAgeRange: true });

    const globalAfter = await request(app).get('/identity/scopes/global-default').set('x-user-id', 'u1');
    expect(globalAfter.body.id).toBe(global.body.id);
    expect(globalAfter.body.identityLevel).toBe('PARTIAL');

    const forbiddenEdit = await request(app)
      .delete(`/identity/scopes/${cirvia.body.id}`)
      .set('x-user-id', 'u2');
    expect(forbiddenEdit.status).toBe(404);

    const notMember = await request(app)
      .put('/identity/scopes/cirvia/c1')
      .set('x-user-id', 'u2')
      .send({ identityLevel: 'PARTIAL' });
    expect(notMember.status).toBe(403);
  });

  test('audit logs and websocket events created', async () => {
    const scope = await request(app)
      .put('/identity/scopes/chat/t1')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'ANONYMOUS', showAgeRange: true, showGender: true });
    expect(scope.status).toBe(200);

    const deleted = await request(app)
      .delete(`/identity/scopes/${scope.body.id}`)
      .set('x-user-id', 'u1');
    expect(deleted.status).toBe(200);

    expect(events).toHaveLength(1);
    expect(events[0][0]).toBe('chat:t1');
    expect(events[0][1]).toBe('identity.updated');

    const actions = store.auditLogs.map((x) => x.action);
    expect(actions).toContain('identity.scope.chat.upsert');
    expect(actions).toContain('identity.scope.delete');
  });

  test('FULL requires chosenName or realName set on profile', async () => {
    store.users.get('u1').profile = { chosenName: '', realName: '' };
    const response = await request(app)
      .put('/identity/scopes/global-default')
      .set('x-user-id', 'u1')
      .send({ identityLevel: 'FULL', showRealName: true });
    expect(response.status).toBe(400);
  });
});
