const express = require('express');
const { createStore } = require('./store');
const {
  normalizePayload,
  validateLevelToggleConsistency,
  requireProfileForLevel,
  validateNameConstraints,
  upsertScope,
  listScopesForUser,
  buildScopeContext,
} = require('./services');

function createApp({ store = createStore(), websocket = { emit: () => {} } } = {}) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    req.userId = req.header('x-user-id') || null;
    next();
  });

  app.use((req, res, next) => {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!store.users.has(req.userId)) return res.status(401).json({ error: 'Unauthorized' });
    next();
  });

  function audit(userId, action, details) {
    store.auditLogs.push({ userId, action, details, createdAt: new Date().toISOString() });
  }

  app.get('/identity/scopes', (req, res) => {
    return res.json(listScopesForUser(store, req.userId));
  });

  app.get('/identity/scopes/global-default', (req, res) => {
    const scope = [...store.scopes.values()].find(
      (s) => s.userId === req.userId && s.scopeType === 'GLOBAL_DEFAULT',
    );
    if (!scope) return res.status(404).json({ error: 'GLOBAL_DEFAULT scope not found' });
    return res.json({ ...scope, ...buildScopeContext(scope, store) });
  });

  app.put('/identity/scopes/global-default', (req, res, next) => {
    try {
      const payload = normalizePayload(req.body);
      validateLevelToggleConsistency(payload);
      const profile = store.users.get(req.userId).profile;
      validateNameConstraints(profile);
      requireProfileForLevel(profile, payload.identityLevel);
      const updated = upsertScope({ store, userId: req.userId, scopeType: 'GLOBAL_DEFAULT', payload });
      audit(req.userId, 'identity.scope.global_default.upsert', { scopeId: updated.id });
      return res.json({ ...updated, ...buildScopeContext(updated, store) });
    } catch (err) {
      return next(err);
    }
  });

  app.put('/identity/scopes/cirvia/:cirviaId', (req, res, next) => {
    try {
      const cirvia = store.cirvias.get(req.params.cirviaId);
      if (!cirvia || !cirvia.members.includes(req.userId)) {
        return res.status(403).json({ error: 'Not a cirvia member' });
      }
      const payload = normalizePayload(req.body);
      validateLevelToggleConsistency(payload);
      const profile = store.users.get(req.userId).profile;
      validateNameConstraints(profile);
      requireProfileForLevel(profile, payload.identityLevel);
      const updated = upsertScope({
        store,
        userId: req.userId,
        scopeType: 'CIRVIA',
        scopeRefId: req.params.cirviaId,
        payload,
      });
      audit(req.userId, 'identity.scope.cirvia.upsert', { scopeId: updated.id, cirviaId: req.params.cirviaId });
      return res.json({ ...updated, ...buildScopeContext(updated, store) });
    } catch (err) {
      return next(err);
    }
  });

  app.put('/identity/scopes/chat/:chatId', (req, res, next) => {
    try {
      const chat = store.chats.get(req.params.chatId);
      if (!chat || !chat.participants.includes(req.userId)) {
        return res.status(403).json({ error: 'Not a chat participant' });
      }
      const payload = normalizePayload(req.body);
      validateLevelToggleConsistency(payload);
      const profile = store.users.get(req.userId).profile;
      validateNameConstraints(profile);
      requireProfileForLevel(profile, payload.identityLevel);
      const updated = upsertScope({
        store,
        userId: req.userId,
        scopeType: 'CHAT',
        scopeRefId: req.params.chatId,
        payload,
      });
      websocket.emit(`chat:${req.params.chatId}`, 'identity.updated', {
        userId: req.userId,
        scopeId: updated.id,
      });
      audit(req.userId, 'identity.scope.chat.upsert', { scopeId: updated.id, chatId: req.params.chatId });
      return res.json({ ...updated, ...buildScopeContext(updated, store) });
    } catch (err) {
      return next(err);
    }
  });

  app.delete('/identity/scopes/:scopeId', (req, res) => {
    const scope = store.scopes.get(req.params.scopeId);
    if (!scope || scope.userId !== req.userId) return res.status(404).json({ error: 'Scope not found' });
    if (scope.scopeType === 'GLOBAL_DEFAULT') {
      return res.status(400).json({ error: 'GLOBAL_DEFAULT cannot be deleted' });
    }

    store.scopes.delete(req.params.scopeId);
    const globalDefault = [...store.scopes.values()].find(
      (s) => s.userId === req.userId && s.scopeType === 'GLOBAL_DEFAULT',
    );
    audit(req.userId, 'identity.scope.delete', { scopeId: req.params.scopeId });
    return res.json({ deletedScopeId: req.params.scopeId, fallbackScopeId: globalDefault?.id || null });
  });

  app.use((err, _req, res, _next) => {
    return res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  app.locals.store = store;
  return app;
}

module.exports = { createApp };
