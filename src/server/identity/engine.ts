import {
  IdentityChangeNotice,
  IdentityLevel,
  IdentityScopeContext,
  IdentityScopeSetting,
  IdentitySnapshot,
} from "./types";
import type {
  DisplayIdentity,
  IdentityProfile,
  IdentityScopeFields,
} from "./types";
import type {
  IdentityRepository,
  MessageCreateInput,
  PostCreateInput,
} from "./repository";

const DEFAULT_SYSTEM_NOTICE = "User changed identity visibility.";

const isScopeAuthorized = async (
  repository: IdentityRepository,
  viewerId: string,
  scope: IdentityScopeContext
): Promise<boolean> => {
  if (scope.type === "DEFAULT_TEMPLATE") {
    return viewerId.length > 0;
  }

  if (scope.type === "CHAT") {
    return repository.viewerHasChatAccess(viewerId, scope.chatId);
  }

  return repository.viewerHasCirviaAccess(viewerId, scope.cirviaId);
};

const getEffectiveScopeSetting = async (
  repository: IdentityRepository,
  userId: string,
  scope: IdentityScopeContext
): Promise<IdentityScopeSetting | null> => {
  const direct = await repository.getScopeSetting(userId, scope);
  if (direct) {
    return direct;
  }

  if (scope.type === "DEFAULT_TEMPLATE") {
    return null;
  }

  return repository.getScopeSetting(userId, { type: "DEFAULT_TEMPLATE" });
};

const pickDisplayName = (
  profile: IdentityProfile,
  fields: IdentityScopeFields,
  identityLevel: IdentityLevel
): string => {
  if (identityLevel === "full") {
    return fields.realName ?? fields.nickname ?? profile.fullName ?? profile.anonDisplayName;
  }

  if (identityLevel === "partial") {
    return fields.nickname ?? profile.anonDisplayName;
  }

  return profile.anonDisplayName;
};

const pickAvatarUrl = (
  profile: IdentityProfile,
  fields: IdentityScopeFields,
  identityLevel: IdentityLevel
): string => {
  if (identityLevel === "full") {
    return fields.profilePhotoUrl ?? profile.profilePhotoUrl ?? profile.anonAvatarUrl;
  }

  return fields.abstractAvatarUrl ?? profile.anonAvatarUrl;
};

const buildDisplayIdentity = (
  profile: IdentityProfile,
  setting: IdentityScopeSetting | null
): DisplayIdentity => {
  const identityLevel: IdentityLevel = setting?.identityLevel ?? "anonymous";
  const fields = setting?.fields ?? {};

  const displayName = pickDisplayName(profile, fields, identityLevel);
  const avatarUrl = pickAvatarUrl(profile, fields, identityLevel);

  if (identityLevel === "anonymous") {
    return {
      identityLevel,
      displayName,
      avatarUrl,
      ageRange: profile.ageRange,
      gender: profile.gender,
    };
  }

  if (identityLevel === "partial") {
    return {
      identityLevel,
      displayName,
      avatarUrl,
      ageRange: profile.ageRange,
      gender: profile.gender,
      city: fields.city ?? null,
      state: fields.state ?? null,
    };
  }

  return {
    identityLevel,
    displayName,
    avatarUrl,
    ageRange: profile.ageRange,
    gender: profile.gender,
    city: fields.city ?? null,
    state: fields.state ?? null,
    profilePhotoUrl: fields.profilePhotoUrl ?? profile.profilePhotoUrl,
  };
};

const buildSnapshot = (displayIdentity: DisplayIdentity): IdentitySnapshot => ({
  identityLevel: displayIdentity.identityLevel,
  displayName: displayIdentity.displayName,
  avatarUrl: displayIdentity.avatarUrl,
  ageRange: displayIdentity.ageRange,
  gender: displayIdentity.gender,
  city: displayIdentity.city ?? null,
  state: displayIdentity.state ?? null,
  profilePhotoUrl: displayIdentity.profilePhotoUrl ?? null,
});

const isVisibilityReduced = (
  previousSetting: IdentityScopeSetting | null,
  nextSetting: IdentityScopeSetting
): boolean => {
  if (!previousSetting) {
    return false;
  }

  const levelOrder: IdentityLevel[] = ["anonymous", "partial", "full"];
  const previousIndex = levelOrder.indexOf(previousSetting.identityLevel);
  const nextIndex = levelOrder.indexOf(nextSetting.identityLevel);

  if (nextIndex < previousIndex) {
    return true;
  }

  if (nextIndex === previousIndex && nextSetting.identityLevel !== "anonymous") {
    const previousFields = previousSetting.fields;
    const nextFields = nextSetting.fields;
    if (
      previousFields.nickname && !nextFields.nickname ||
      previousFields.city && !nextFields.city ||
      previousFields.state && !nextFields.state ||
      previousFields.profilePhotoUrl && !nextFields.profilePhotoUrl ||
      previousFields.realName && !nextFields.realName
    ) {
      return true;
    }
  }

  return false;
};

export const resolveDisplayIdentity = async (
  repository: IdentityRepository,
  viewerId: string,
  subjectId: string,
  scope: IdentityScopeContext
): Promise<DisplayIdentity | null> => {
  const isAuthorized = await isScopeAuthorized(repository, viewerId, scope);
  if (!isAuthorized) {
    return null;
  }

  const profile = await repository.getProfile(subjectId);
  if (!profile) {
    return null;
  }

  if (viewerId === subjectId) {
    return {
      identityLevel: "full",
      displayName: profile.fullName ?? profile.anonDisplayName,
      avatarUrl: profile.profilePhotoUrl ?? profile.anonAvatarUrl,
      ageRange: profile.ageRange,
      gender: profile.gender,
      profilePhotoUrl: profile.profilePhotoUrl,
    };
  }

  const setting = await getEffectiveScopeSetting(repository, subjectId, scope);
  return buildDisplayIdentity(profile, setting);
};

export const setIdentityScope = async (
  repository: IdentityRepository,
  userId: string,
  scope: IdentityScopeContext,
  identityLevel: IdentityLevel,
  fields: IdentityScopeFields
): Promise<IdentityChangeNotice | null> => {
  const previousSetting = await repository.getScopeSetting(userId, scope);
  const nextSetting: IdentityScopeSetting = {
    userId,
    scopeType: scope.type,
    scopeId: scope.type === "DEFAULT_TEMPLATE" ? null : scope.type === "CHAT" ? scope.chatId : scope.cirviaId,
    identityLevel,
    fields,
  };

  await repository.upsertScopeSetting(nextSetting);
  await repository.logIdentityChange(userId, previousSetting, nextSetting);

  if (isVisibilityReduced(previousSetting, nextSetting)) {
    await repository.insertSystemNotice(userId, scope, DEFAULT_SYSTEM_NOTICE);
    return { scope, systemMessage: DEFAULT_SYSTEM_NOTICE };
  }

  return null;
};

export const applyIdentitySnapshotOnMessageCreate = async (
  repository: IdentityRepository,
  input: MessageCreateInput
): Promise<IdentitySnapshot | null> => {
  const displayIdentity = await resolveDisplayIdentity(
    repository,
    input.authorId,
    input.authorId,
    { type: "CHAT", chatId: input.chatId }
  );

  if (!displayIdentity) {
    return null;
  }

  const snapshot = buildSnapshot(displayIdentity);
  await repository.insertMessageSnapshot(input.messageId, snapshot);
  return snapshot;
};

export const applyIdentitySnapshotOnPostCreate = async (
  repository: IdentityRepository,
  input: PostCreateInput
): Promise<IdentitySnapshot | null> => {
  const displayIdentity = await resolveDisplayIdentity(
    repository,
    input.authorId,
    input.authorId,
    { type: "CIRVIA", cirviaId: input.cirviaId }
  );

  if (!displayIdentity) {
    return null;
  }

  const snapshot = buildSnapshot(displayIdentity);
  await repository.insertPostSnapshot(input.postId, snapshot);
  return snapshot;
};
