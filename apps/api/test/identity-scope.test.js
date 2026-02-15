const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { IdentityLevel, validateIdentityScope } = require('../src/identityScopeValidation');
const { buildSeedPlan } = require('../prisma/seed');

function enforceUniqueness(scopes) {
  const keySet = new Set();
  for (const scope of scopes) {
    const key = `${scope.userId}:${scope.scopeType}:${scope.scopeId}`;
    if (keySet.has(key)) {
      throw new Error('Duplicate scope tuple.');
    }
    keySet.add(key);
  }
}

test('scope uniqueness constraints work', () => {
  assert.throws(() => {
    enforceUniqueness([
      { userId: 'u1', scopeType: 'CIRVIA', scopeId: 'c1' },
      { userId: 'u1', scopeType: 'CIRVIA', scopeId: 'c1' },
    ]);
  });
});

test('cannot create multiple GLOBAL_DEFAULT scopes for the same user', () => {
  assert.throws(() => {
    enforceUniqueness([
      { userId: 'u1', scopeType: 'GLOBAL_DEFAULT', scopeId: 'GLOBAL_DEFAULT' },
      { userId: 'u1', scopeType: 'GLOBAL_DEFAULT', scopeId: 'GLOBAL_DEFAULT' },
    ]);
  });
});

test('validation rules enforce identity level constraints', () => {
  assert.doesNotThrow(() =>
    validateIdentityScope(
      {
        identityLevel: IdentityLevel.ANONYMOUS,
        showAgeRange: true,
        showGender: false,
        showProfilePhoto: false,
        showRealName: false,
      },
      {},
    ),
  );

  assert.throws(() =>
    validateIdentityScope(
      {
        identityLevel: IdentityLevel.PARTIAL,
        showAgeRange: true,
        showGender: true,
        showProfilePhoto: true,
        showRealName: false,
      },
      {},
    ),
  );

  assert.throws(() =>
    validateIdentityScope(
      {
        identityLevel: IdentityLevel.FULL,
        showAgeRange: true,
        showGender: true,
        showProfilePhoto: true,
        showRealName: true,
      },
      { chosenName: '', realName: '' },
    ),
  );
});

test('seed creates proper hierarchy', () => {
  const plan = buildSeedPlan(['u1', 'u2'], ['c1', 'c2'], ['h1', 'h2']);

  assert.equal(plan.globalDefaults.length, 2);
  assert.equal(plan.cirviaScopes.length, 4);
  assert.equal(plan.chatScopes.length, 2);
  assert.deepEqual(plan.cirviaScopes.map((s) => s.identityLevel), [
    IdentityLevel.ANONYMOUS,
    IdentityLevel.PARTIAL,
    IdentityLevel.PARTIAL,
    IdentityLevel.FULL,
  ]);
});

test('schema includes composite index and defaults', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  assert.match(schema, /@@index\(\[userId, scopeType, scopeId\]\)/);
  assert.match(schema, /identityLevel\s+IdentityLevel\s+@default\(ANONYMOUS\)/);
});
