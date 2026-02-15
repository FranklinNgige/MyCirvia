const { IdentityLevel, TOGGLES } = require('./constants');

const COMMON_REAL_NAMES = new Set(['john', 'jane', 'michael', 'sarah', 'david', 'emma']);
const PROFANITY = ['damn', 'hell', 'shit', 'fuck'];

function hasProfanity(text) {
  const normalized = text.toLowerCase();
  return PROFANITY.some((w) => normalized.includes(w));
}

function nowId() {
  return `scope_${Math.random().toString(36).slice(2, 12)}`;
}

function requireProfileForLevel(profile, identityLevel) {
  if (identityLevel === IdentityLevel.ANONYMOUS) return;
  const hasChosen = Boolean(profile?.chosenName);
  const hasReal = Boolean(profile?.realName);
  if (!hasChosen && !hasReal) {
    const err = new Error('PARTIAL and FULL require chosenName or realName on profile');
    err.status = 400;
    throw err;
  }
}

function validateNameConstraints(profile) {
  if (!profile) return;
  const { chosenName, realName } = profile;
  if (chosenName !== undefined && chosenName !== null) {
    if (chosenName.length < 2 || chosenName.length > 30) {
      const err = new Error('chosenName must be 2-30 chars');
      err.status = 400;
      throw err;
    }
    if (hasProfanity(chosenName)) {
      const err = new Error('chosenName contains profanity');
      err.status = 400;
      throw err;
    }
    if (COMMON_REAL_NAMES.has(chosenName.toLowerCase())) {
      const err = new Error('chosenName cannot be a common real name');
      err.status = 400;
      throw err;
    }
  }

  if (realName !== undefined && realName !== null) {
    if (realName.length < 1 || realName.length > 50) {
      const err = new Error('realName must be 1-50 chars');
      err.status = 400;
      throw err;
    }
  }
}

function normalizePayload(input = {}) {
  const output = {};
  TOGGLES.forEach((key) => {
    if (input[key] !== undefined) output[key] = Boolean(input[key]);
  });
  if (input.identityLevel) output.identityLevel = input.identityLevel;
  return output;
}

function validateLevelToggleConsistency(input) {
  const { identityLevel } = input;
  if (!Object.values(IdentityLevel).includes(identityLevel)) {
    const err = new Error('Invalid identityLevel');
    err.status = 400;
    throw err;
  }

  if (identityLevel === IdentityLevel.ANONYMOUS) {
    const disallowed = ['showCity', 'showState', 'showProfilePhoto', 'showRealName', 'useChosenName'];
    if (disallowed.some((k) => input[k])) {
      const err = new Error('ANONYMOUS only allows showAgeRange and showGender');
      err.status = 400;
      throw err;
    }
  }

  if (identityLevel === IdentityLevel.PARTIAL) {
    if (input.showProfilePhoto || input.showRealName) {
      const err = new Error('PARTIAL cannot enable showProfilePhoto or showRealName');
      err.status = 400;
      throw err;
    }
  }
}

function buildScopeContext(scope, store) {
  if (scope.scopeType === 'GLOBAL_DEFAULT') return {};
  if (scope.scopeType === 'CIRVIA') {
    return { cirviaName: store.cirvias.get(scope.scopeRefId)?.name || null };
  }
  if (scope.scopeType === 'CHAT') {
    const chat = store.chats.get(scope.scopeRefId);
    return { chatParticipantNames: chat?.participantNames || [] };
  }
  return {};
}

function withDefaultToggles(data) {
  const toggles = {};
  TOGGLES.forEach((k) => {
    toggles[k] = Boolean(data[k]);
  });
  return toggles;
}

function upsertScope({ store, userId, scopeType, scopeRefId = null, payload }) {
  const existing = [...store.scopes.values()].find(
    (s) => s.userId === userId && s.scopeType === scopeType && s.scopeRefId === scopeRefId,
  );
  const base = existing || { id: nowId(), userId, scopeType, scopeRefId, createdAt: new Date().toISOString() };
  const merged = {
    ...base,
    ...withDefaultToggles(base),
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  store.scopes.set(merged.id, merged);
  return merged;
}

function listScopesForUser(store, userId) {
  return [...store.scopes.values()]
    .filter((s) => s.userId === userId)
    .map((scope) => ({ ...scope, ...buildScopeContext(scope, store) }));
}

module.exports = {
  normalizePayload,
  validateLevelToggleConsistency,
  requireProfileForLevel,
  validateNameConstraints,
  upsertScope,
  listScopesForUser,
  buildScopeContext,
};
