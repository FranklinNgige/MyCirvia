import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditLogService } from '../audit/audit-log.service';
import { IdentityScopeRepository, ProfileRepository, AvatarSigner } from '../identity-scope/repositories';
import { IdentityScope, Profile, ScopeType } from '../identity-scope/types';
import { IdentityResolverService } from '../identity-scope/services/IdentityResolverService';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, CreatePostDto, FeedQueryDto, UpdatePostDto } from './dto/feed.dto';

type Membership = { status: string; role: string };
type PostRow = {
  id: string;
  cirviaId: string;
  authorId: string;
  contentText: string;
  mediaKeys: string | null;
  visibility: string;
  isPinned: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type CommentRow = {
  id: string;
  postId: string;
  authorId: string;
  contentText: string;
  parentCommentId: string | null;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

class DbProfileRepository implements ProfileRepository {
  constructor(private readonly db: PrismaService) {}

  async getByUserId(userId: string): Promise<Profile | null> {
    const user = this.db.get<{ id: string; email: string }>('SELECT id, email FROM "User" WHERE id = ?', [userId]);
    return user ? this.toProfile(user) : null;
  }

  async getByUserIds(userIds: string[]): Promise<Map<string, Profile>> {
    if (userIds.length === 0) return new Map();
    const placeholders = userIds.map(() => '?').join(',');
    const rows = this.db.all<{ id: string; email: string }>(`SELECT id, email FROM "User" WHERE id IN (${placeholders})`, userIds);
    return new Map(rows.map((row) => [row.id, this.toProfile(row)]));
  }

  private toProfile(user: { id: string; email: string }): Profile {
    const label = user.email.split('@')[0];
    return {
      userId: user.id,
      abstractName: `user-${user.id.slice(0, 6)}`,
      chosenName: label,
      realName: label,
      abstractAvatarKey: `avatar/${user.id}`,
    };
  }
}

class DbIdentityScopeRepository implements IdentityScopeRepository {
  constructor(private readonly db: PrismaService) {}

  async getByUserAndScope(userId: string, scopeType: ScopeType, scopeId: string | null): Promise<IdentityScope | null> {
    if (scopeType === 'GLOBAL_DEFAULT') return this.getGlobalDefault(userId);
    if (scopeType !== 'CIRVIA' || !scopeId) return null;
    const row = this.db.get<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope" WHERE userId = ? AND cirviaId = ? AND scope = ?`,
      [userId, scopeId, 'CIRVIA'],
    );
    return row ? this.toIdentityScope(row) : null;
  }

  async getGlobalDefault(userId: string): Promise<IdentityScope | null> {
    const row = this.db.get<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope" WHERE userId = ? AND scope = ? LIMIT 1`,
      [userId, 'GLOBAL_DEFAULT'],
    );
    return row ? this.toIdentityScope(row) : null;
  }

  async createGlobalDefaultAnonymous(userId: string): Promise<IdentityScope> {
    this.db.run(
      `INSERT INTO "IdentityScope" (id, userId, cirviaId, scope, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [randomUUID(), userId, null, 'GLOBAL_DEFAULT', 'ANONYMOUS', 0, 0, 0, 0, 0, 0, null],
    );
    return this.toIdentityScope({ userId, cirviaId: null });
  }

  async getByUsersAndScope(userIds: string[], scopeType: ScopeType, scopeId: string | null): Promise<Map<string, IdentityScope>> {
    if (userIds.length === 0 || scopeType !== 'CIRVIA' || !scopeId) return new Map();
    const placeholders = userIds.map(() => '?').join(',');
    const rows = this.db.all<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope" WHERE scope = 'CIRVIA' AND cirviaId = ? AND userId IN (${placeholders})`,
      [scopeId, ...userIds],
    );
    return new Map(rows.map((row) => [row.userId, this.toIdentityScope(row)]));
  }

  async getGlobalDefaults(userIds: string[]): Promise<Map<string, IdentityScope>> {
    if (userIds.length === 0) return new Map();
    const placeholders = userIds.map(() => '?').join(',');
    const rows = this.db.all<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope" WHERE scope = 'GLOBAL_DEFAULT' AND userId IN (${placeholders})`,
      userIds,
    );
    return new Map(rows.map((row) => [row.userId, this.toIdentityScope(row)]));
  }

  private toIdentityScope(row: any): IdentityScope {
    return {
      userId: row.userId,
      scopeType: row.cirviaId ? 'CIRVIA' : 'GLOBAL_DEFAULT',
      scopeId: row.cirviaId,
      identityLevel: row.identityLevel ?? 'ANONYMOUS',
      showAgeRange: Boolean(row.showAgeRange),
      showGender: Boolean(row.showGender),
      showCity: Boolean(row.showCity),
      showState: Boolean(row.showState),
      showBio: Boolean(row.showBio),
      showProfilePhoto: Boolean(row.showProfilePhoto),
      customAvatarKey: row.customAvatarKey ?? undefined,
    };
  }
}

class NoopAvatarSigner implements AvatarSigner {
  async toSignedUrl(key: string): Promise<string> {
    return `https://cdn.example/${key}`;
  }
}

@Injectable()
export class FeedService {
  private readonly identityResolver: IdentityResolverService;

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditLogService,
  ) {
    this.identityResolver = new IdentityResolverService(
      new DbProfileRepository(this.db),
      new DbIdentityScopeRepository(this.db),
      new NoopAvatarSigner(),
    );
  }

  async createPost(cirviaId: string, dto: CreatePostDto, actor: CurrentUserPayload) {
    this.assertText(dto.contentText, 5000);
    this.requireMember(cirviaId, actor.userId);

    const id = randomUUID();
    const mediaKeys = dto.mediaKeys ? JSON.stringify(dto.mediaKeys) : null;

    this.db.run(
      `INSERT INTO "Post" (id, cirviaId, authorId, contentText, mediaKeys, visibility, isPinned, isDeleted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'MEMBERS_ONLY', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, cirviaId, actor.userId, dto.contentText, mediaKeys],
    );

    this.audit.log('post.create', { postId: id, cirviaId, actorUserId: actor.userId });
    const post = this.getPostOrThrow(id);
    return this.attachPostContext(post, actor.userId);
  }

  async listFeed(cirviaId: string, query: FeedQueryDto, actor: CurrentUserPayload) {
    this.requireMember(cirviaId, actor.userId);

    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
    const cursor = query.cursor;
    const rows = cursor
      ? this.db.all<PostRow>(
          `SELECT * FROM "Post" WHERE cirviaId = ? AND isDeleted = 0 AND createdAt < ? ORDER BY createdAt DESC LIMIT ?`,
          [cirviaId, cursor, limit],
        )
      : this.db.all<PostRow>(
          `SELECT * FROM "Post" WHERE cirviaId = ? AND isDeleted = 0 ORDER BY createdAt DESC LIMIT ?`,
          [cirviaId, limit],
        );

    const items = await Promise.all(rows.map((post) => this.attachPostContext(post, actor.userId)));
    return { items, nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt : null };
  }

  async getPost(postId: string, actor: CurrentUserPayload) {
    const post = this.getPostOrThrow(postId);
    this.requireMember(post.cirviaId, actor.userId);
    return this.attachPostContext(post, actor.userId);
  }

  async updatePost(postId: string, dto: UpdatePostDto, actor: CurrentUserPayload) {
    this.assertText(dto.contentText, 5000);
    const post = this.getPostOrThrow(postId);
    this.requireMember(post.cirviaId, actor.userId);
    if (post.authorId !== actor.userId) throw new ForbiddenException('Only author can update post');

    this.db.run(`UPDATE "Post" SET contentText = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, [dto.contentText, postId]);
    this.audit.log('post.update', { postId, actorUserId: actor.userId });
    return this.attachPostContext(this.getPostOrThrow(postId), actor.userId);
  }

  async deletePost(postId: string, actor: CurrentUserPayload) {
    const post = this.getPostOrThrow(postId);
    const membership = this.requireMember(post.cirviaId, actor.userId);
    if (post.authorId !== actor.userId && !['ADMIN', 'OWNER'].includes(membership.role)) {
      throw new ForbiddenException('Only author or admin can delete post');
    }

    this.db.run(`UPDATE "Post" SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, [postId]);
    this.audit.log('post.delete', { postId, actorUserId: actor.userId });
    return { postId, isDeleted: true };
  }

  async likePost(postId: string, actor: CurrentUserPayload) {
    const post = this.getPostOrThrow(postId);
    this.requireMember(post.cirviaId, actor.userId);
    this.db.run(
      `INSERT OR IGNORE INTO "PostLike" (id, postId, userId, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [randomUUID(), postId, actor.userId],
    );
    return { postId, likeCount: this.postLikeCount(postId) };
  }

  async unlikePost(postId: string, actor: CurrentUserPayload) {
    const post = this.getPostOrThrow(postId);
    this.requireMember(post.cirviaId, actor.userId);
    this.db.run(`DELETE FROM "PostLike" WHERE postId = ? AND userId = ?`, [postId, actor.userId]);
    return { postId, likeCount: this.postLikeCount(postId) };
  }

  async createComment(postId: string, dto: CreateCommentDto, actor: CurrentUserPayload) {
    this.assertText(dto.contentText, 1000);
    const post = this.getPostOrThrow(postId);
    this.requireMember(post.cirviaId, actor.userId);

    if (dto.parentCommentId) {
      const parent = this.getCommentOrThrow(dto.parentCommentId);
      if (parent.postId !== postId) throw new ForbiddenException('Parent comment must belong to same post');
    }

    const commentId = randomUUID();
    this.db.run(
      `INSERT INTO "Comment" (id, postId, authorId, contentText, parentCommentId, isDeleted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [commentId, postId, actor.userId, dto.contentText, dto.parentCommentId ?? null],
    );

    return this.attachCommentContext(this.getCommentOrThrow(commentId), actor.userId, post.cirviaId);
  }

  async listComments(postId: string, actor: CurrentUserPayload) {
    const post = this.getPostOrThrow(postId);
    this.requireMember(post.cirviaId, actor.userId);

    const comments = this.db.all<CommentRow>(
      `SELECT * FROM "Comment" WHERE postId = ? AND isDeleted = 0 ORDER BY createdAt ASC`,
      [postId],
    );

    const identityMap = await this.identityResolver.resolveIdentityBulk(
      actor.userId,
      comments.map((comment) => comment.authorId),
      { scopeType: 'CIRVIA', scopeId: post.cirviaId },
    );

    const commentNodes = comments.map((comment) => ({
      ...this.serializeComment(comment),
      author: identityMap.get(comment.authorId),
      likeCount: this.commentLikeCount(comment.id),
      replies: [] as any[],
    }));

    const byId = new Map(commentNodes.map((node) => [node.id, node]));
    const root: any[] = [];
    for (const node of commentNodes) {
      if (node.parentCommentId) {
        const parent = byId.get(node.parentCommentId);
        if (parent) {
          parent.replies.push(node);
          continue;
        }
      }
      root.push(node);
    }

    return { items: root };
  }

  async deleteComment(commentId: string, actor: CurrentUserPayload) {
    const comment = this.getCommentOrThrow(commentId);
    const post = this.getPostOrThrow(comment.postId);
    const membership = this.requireMember(post.cirviaId, actor.userId);
    if (comment.authorId !== actor.userId && !['ADMIN', 'OWNER'].includes(membership.role)) {
      throw new ForbiddenException('Only author or admin can delete comment');
    }

    this.db.run(
      `UPDATE "Comment" SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [commentId],
    );
    return { commentId, isDeleted: true };
  }

  async likeComment(commentId: string, actor: CurrentUserPayload) {
    const comment = this.getCommentOrThrow(commentId);
    const post = this.getPostOrThrow(comment.postId);
    this.requireMember(post.cirviaId, actor.userId);
    this.db.run(
      `INSERT OR IGNORE INTO "CommentLike" (id, commentId, userId, createdAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [randomUUID(), commentId, actor.userId],
    );
    return { commentId, likeCount: this.commentLikeCount(commentId) };
  }

  async unlikeComment(commentId: string, actor: CurrentUserPayload) {
    const comment = this.getCommentOrThrow(commentId);
    const post = this.getPostOrThrow(comment.postId);
    this.requireMember(post.cirviaId, actor.userId);
    this.db.run(`DELETE FROM "CommentLike" WHERE commentId = ? AND userId = ?`, [commentId, actor.userId]);
    return { commentId, likeCount: this.commentLikeCount(commentId) };
  }

  private postLikeCount(postId: string): number {
    const row = this.db.get<{ count: number }>('SELECT COUNT(*) AS count FROM "PostLike" WHERE postId = ?', [postId]);
    return Number(row?.count ?? 0);
  }

  private commentLikeCount(commentId: string): number {
    const row = this.db.get<{ count: number }>('SELECT COUNT(*) AS count FROM "CommentLike" WHERE commentId = ?', [commentId]);
    return Number(row?.count ?? 0);
  }

  private getPostOrThrow(postId: string): PostRow {
    const post = this.db.get<PostRow>('SELECT * FROM "Post" WHERE id = ? AND isDeleted = 0', [postId]);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private getCommentOrThrow(commentId: string): CommentRow {
    const comment = this.db.get<CommentRow>('SELECT * FROM "Comment" WHERE id = ? AND isDeleted = 0', [commentId]);
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private assertText(text: string, max: number) {
    if (!text || text.trim().length === 0 || text.length > max) {
      throw new ForbiddenException(`contentText must be between 1 and ${max} chars`);
    }
  }

  private requireMember(cirviaId: string, userId: string): Membership {
    const member = this.db.get<Membership>('SELECT role, status FROM "CirviaMember" WHERE cirviaId = ? AND userId = ?', [
      cirviaId,
      userId,
    ]);

    if (!member) throw new ForbiddenException('Membership required');
    if (member.status === 'BANNED') throw new ForbiddenException('Banned members have no access');
    if (member.status !== 'ACTIVE') throw new ForbiddenException('Active membership required');
    return member;
  }

  private async attachPostContext(post: PostRow, viewerUserId: string) {
    const author = await this.identityResolver.resolveIdentity(viewerUserId, post.authorId, {
      scopeType: 'CIRVIA',
      scopeId: post.cirviaId,
    });

    const userLike = this.db.get('SELECT 1 FROM "PostLike" WHERE postId = ? AND userId = ? LIMIT 1', [post.id, viewerUserId]);
    const comments = this.db.get<{ count: number }>('SELECT COUNT(*) AS count FROM "Comment" WHERE postId = ? AND isDeleted = 0', [post.id]);

    return {
      post: this.serializePost(post),
      author,
      likeCount: this.postLikeCount(post.id),
      commentCount: Number(comments?.count ?? 0),
      likedByCurrentUser: Boolean(userLike),
    };
  }

  private async attachCommentContext(comment: CommentRow, viewerUserId: string, cirviaId: string) {
    const author = await this.identityResolver.resolveIdentity(viewerUserId, comment.authorId, {
      scopeType: 'CIRVIA',
      scopeId: cirviaId,
    });

    return {
      comment: this.serializeComment(comment),
      author,
      likeCount: this.commentLikeCount(comment.id),
    };
  }

  private serializePost(post: PostRow) {
    return {
      id: post.id,
      cirviaId: post.cirviaId,
      authorId: post.authorId,
      contentText: post.contentText,
      mediaKeys: post.mediaKeys ? JSON.parse(post.mediaKeys) : [],
      visibility: post.visibility,
      isPinned: Boolean(post.isPinned),
      isDeleted: Boolean(post.isDeleted),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      deletedAt: post.deletedAt,
    };
  }

  private serializeComment(comment: CommentRow) {
    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      contentText: comment.contentText,
      parentCommentId: comment.parentCommentId,
      isDeleted: Boolean(comment.isDeleted),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      deletedAt: comment.deletedAt,
    };
  }
}
