const IdentityLevel = Object.freeze({
  ANONYMOUS: 'ANONYMOUS',
  PARTIAL: 'PARTIAL',
  FULL: 'FULL',
});

function validateIdentityScope(scope, profile = {}) {
  const { identityLevel, showAgeRange, showGender, showProfilePhoto, showRealName } = scope;

  if (identityLevel === IdentityLevel.ANONYMOUS) {
    if (showProfilePhoto || showRealName) {
      throw new Error('ANONYMOUS scopes cannot enable showProfilePhoto or showRealName.');
    }

    const allowed = new Set(['showAgeRange', 'showGender']);
    for (const [key, value] of Object.entries({ showAgeRange, showGender, showProfilePhoto, showRealName })) {
      if (!allowed.has(key) && value) {
        throw new Error(`ANONYMOUS scopes cannot enable ${key}.`);
      }
    }
  }

  if (identityLevel === IdentityLevel.PARTIAL) {
    if (showProfilePhoto || showRealName) {
      throw new Error('PARTIAL scopes cannot enable showProfilePhoto or showRealName.');
    }
  }

  if (identityLevel === IdentityLevel.FULL) {
    const hasChosenName = Boolean(profile.chosenName && profile.chosenName.trim().length > 0);
    const hasRealName = Boolean(profile.realName && profile.realName.trim().length > 0);
    if (!hasChosenName && !hasRealName) {
      throw new Error('FULL scopes require either chosenName or realName on profile.');
    }
  }

  return true;
}

module.exports = {
  IdentityLevel,
  validateIdentityScope,
};
