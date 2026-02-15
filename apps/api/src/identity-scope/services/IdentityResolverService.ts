import { AvatarSigner, IdentityScopeRepository, ProfileRepository } from '../repositories';
import { IdentityContext, IdentityScope, Profile, ResolvedIdentityDTO } from '../types';

export class NotFoundError extends Error {}

export class IdentityResolverService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly scopeRepository: IdentityScopeRepository,
    private readonly avatarSigner: AvatarSigner,
  ) {}

  async resolveIdentity(viewerUserId: string, subjectUserId: string, context: IdentityContext): Promise<ResolvedIdentityDTO> {
    const profile = await this.profileRepository.getByUserId(subjectUserId);
    if (!profile) {
      throw new NotFoundError(`User ${subjectUserId} was not found`);
    }

    if (viewerUserId === subjectUserId) {
      return this.resolveSelf(profile);
    }

    const scope = await this.lookupScope(subjectUserId, context);
    return this.resolveByScope(profile, scope);
  }

  async resolveIdentityBulk(
    viewerUserId: string,
    subjectUserIds: string[],
    context: IdentityContext,
  ): Promise<Map<string, ResolvedIdentityDTO>> {
    const uniqueUserIds = [...new Set(subjectUserIds)];
    const profiles = await this.profileRepository.getByUserIds(uniqueUserIds);
    const exactScopes = await this.scopeRepository.getByUsersAndScope(uniqueUserIds, context.scopeType, context.scopeId);
    const globalScopes = await this.scopeRepository.getGlobalDefaults(uniqueUserIds);

    const result = new Map<string, ResolvedIdentityDTO>();

    for (const subjectUserId of uniqueUserIds) {
      const profile = profiles.get(subjectUserId);
      if (!profile) {
        continue;
      }

      if (viewerUserId === subjectUserId) {
        result.set(subjectUserId, await this.resolveSelf(profile));
        continue;
      }

      let scope = exactScopes.get(subjectUserId) ?? globalScopes.get(subjectUserId);
      if (!scope) {
        scope = await this.scopeRepository.createGlobalDefaultAnonymous(subjectUserId);
      }

      result.set(subjectUserId, await this.resolveByScope(profile, scope));
    }

    return result;
  }

  async getUserIdentityScope(userId: string, scopeType: IdentityContext['scopeType'], scopeId: string | null): Promise<IdentityScope> {
    return this.lookupScope(userId, { scopeType, scopeId });
  }

  private async lookupScope(userId: string, context: IdentityContext): Promise<IdentityScope> {
    const exact = await this.scopeRepository.getByUserAndScope(userId, context.scopeType, context.scopeId);
    if (exact) {
      return exact;
    }

    const global = await this.scopeRepository.getGlobalDefault(userId);
    if (global) {
      return global;
    }

    return this.scopeRepository.createGlobalDefaultAnonymous(userId);
  }

  private async resolveSelf(profile: Profile): Promise<ResolvedIdentityDTO> {
    return {
      userId: profile.userId,
      displayName: profile.realName ?? profile.chosenName ?? profile.abstractName,
      avatarUrl: await this.avatarSigner.toSignedUrl(profile.profilePhotoKey ?? profile.abstractAvatarKey),
      identityLevel: 'FULL',
      ageRange: profile.ageRange,
      gender: profile.gender,
      city: profile.city,
      state: profile.state,
      bio: profile.bio,
    };
  }

  private async resolveByScope(profile: Profile, scope: IdentityScope): Promise<ResolvedIdentityDTO> {
    if (scope.identityLevel === 'ANONYMOUS') {
      return {
        userId: profile.userId,
        displayName: profile.abstractName,
        avatarUrl: await this.avatarSigner.toSignedUrl(profile.abstractAvatarKey),
        identityLevel: 'ANONYMOUS',
        ageRange: scope.showAgeRange ? profile.ageRange : undefined,
        gender: scope.showGender ? profile.gender : undefined,
      };
    }

    if (scope.identityLevel === 'PARTIAL') {
      return {
        userId: profile.userId,
        displayName: profile.chosenName ?? profile.abstractName,
        avatarUrl: await this.avatarSigner.toSignedUrl(scope.customAvatarKey ?? profile.abstractAvatarKey),
        identityLevel: 'PARTIAL',
        ageRange: scope.showAgeRange ? profile.ageRange : undefined,
        gender: scope.showGender ? profile.gender : undefined,
        city: scope.showCity ? profile.city : undefined,
        state: scope.showState ? profile.state : undefined,
      };
    }

    return {
      userId: profile.userId,
      displayName: profile.realName ?? profile.chosenName ?? profile.abstractName,
      avatarUrl: await this.avatarSigner.toSignedUrl(
        scope.showProfilePhoto && profile.profilePhotoKey ? profile.profilePhotoKey : profile.abstractAvatarKey,
      ),
      identityLevel: 'FULL',
      ageRange: scope.showAgeRange ? profile.ageRange : undefined,
      gender: scope.showGender ? profile.gender : undefined,
      city: scope.showCity ? profile.city : undefined,
      state: scope.showState ? profile.state : undefined,
      bio: scope.showBio ? profile.bio : undefined,
    };
  }
}
