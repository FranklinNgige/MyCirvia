import type {
  DisplayIdentity,
  IdentityScopeContext,
  IdentityScopeSetting,
  IdentityProfile,
  IdentitySnapshot,
} from "./types";

export interface IdentityRepository {
  getProfile(userId: string): Promise<IdentityProfile | null>;
  getScopeSetting(
    userId: string,
    scope: IdentityScopeContext
  ): Promise<IdentityScopeSetting | null>;
  upsertScopeSetting(setting: IdentityScopeSetting): Promise<void>;
  logIdentityChange(
    userId: string,
    previousSetting: IdentityScopeSetting | null,
    nextSetting: IdentityScopeSetting
  ): Promise<void>;
  insertSystemNotice(
    userId: string,
    scope: IdentityScopeContext,
    message: string
  ): Promise<void>;
  viewerHasChatAccess(viewerId: string, chatId: string): Promise<boolean>;
  viewerHasCirviaAccess(viewerId: string, cirviaId: string): Promise<boolean>;
  insertMessageSnapshot(
    messageId: string,
    snapshot: IdentitySnapshot
  ): Promise<void>;
  insertPostSnapshot(postId: string, snapshot: IdentitySnapshot): Promise<void>;
}

export interface MessageCreateInput {
  messageId: string;
  authorId: string;
  chatId: string;
}

export interface PostCreateInput {
  postId: string;
  authorId: string;
  cirviaId: string;
}

export interface IdentityResolutionResult {
  displayIdentity: DisplayIdentity | null;
  isAuthorized: boolean;
}
