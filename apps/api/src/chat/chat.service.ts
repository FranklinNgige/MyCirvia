import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { safeLog } from '../logging/logger';
import { PrismaService } from '../prisma/prisma.service';
import { IdentityResolverService } from '../identity-scope/services/IdentityResolverService';
import { AvatarSigner, IdentityScopeRepository, ProfileRepository } from '../identity-scope/repositories';
import { IdentityScope, Profile, ScopeType } from '../identity-scope/types';
import { ChatRedisService } from './chat.redis.service';
import { ChatMessagesQueryDto, CreateOneToOneChatDto, SendMessageDto } from './dto/chat.dto';

class DbProfileRepository implements ProfileRepository { constructor(private readonly db: PrismaService) {} async getByUserId(userId: string): Promise<Profile | null> { const user = this.db.get<any>('SELECT id, email FROM "User" WHERE id = ?', [userId]); if (!user) return null; return { userId: user.id, abstractName: `user-${user.id.slice(0, 6)}`, chosenName: user.email.split('@')[0], realName: user.email.split('@')[0], abstractAvatarKey: `avatar/${user.id}` }; } async getByUserIds(userIds: string[]): Promise<Map<string, Profile>> { if (!userIds.length) return new Map(); const rows = this.db.all<any>(`SELECT id, email FROM "User" WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds); return new Map(rows.map((r) => [r.id, { userId: r.id, abstractName: `user-${r.id.slice(0, 6)}`, chosenName: r.email.split('@')[0], realName: r.email.split('@')[0], abstractAvatarKey: `avatar/${r.id}` }])); } }
class DbIdentityScopeRepository implements IdentityScopeRepository { constructor(private readonly db: PrismaService) {} async getByUserAndScope(userId: string, scopeType: ScopeType, scopeId: string | null): Promise<IdentityScope | null> { if (scopeType === 'GLOBAL_DEFAULT') return this.getGlobalDefault(userId); if (!scopeId) return null; const scope = scopeType === 'CIRVIA' ? 'CIRVIA' : 'CHAT_1TO1'; const row = this.db.get<any>('SELECT * FROM "IdentityScope" WHERE userId = ? AND cirviaId IS ? AND scope = ?', [userId, scopeType === 'CIRVIA' ? scopeId : null, scope]); return row ? this.to(row) : null; } async getGlobalDefault(userId: string): Promise<IdentityScope | null> { const row = this.db.get<any>('SELECT * FROM "IdentityScope" WHERE userId = ? AND scope = ?', [userId, 'GLOBAL_DEFAULT']); return row ? this.to(row) : null; } async createGlobalDefaultAnonymous(userId: string): Promise<IdentityScope> { this.db.run('INSERT INTO "IdentityScope" (id,userId,cirviaId,scope,identityLevel,createdAt) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)', [randomUUID(), userId, null, 'GLOBAL_DEFAULT', 'ANONYMOUS']); return { userId, scopeType: 'GLOBAL_DEFAULT', scopeId: null, identityLevel: 'ANONYMOUS', showAgeRange: false, showGender: false, showCity: false, showState: false, showBio: false, showProfilePhoto: false }; } async getByUsersAndScope(userIds: string[], scopeType: ScopeType, scopeId: string | null): Promise<Map<string, IdentityScope>> { if (!userIds.length) return new Map(); if (scopeType === 'GLOBAL_DEFAULT') return new Map(); const scope = scopeType === 'CIRVIA' ? 'CIRVIA' : 'CHAT_1TO1'; const params: any[] = [scope, ...userIds]; let sql = `SELECT * FROM "IdentityScope" WHERE scope = ? AND userId IN (${userIds.map(() => '?').join(',')})`; if (scopeType === 'CIRVIA' && scopeId) { sql += ' AND cirviaId = ?'; params.push(scopeId); } const rows = this.db.all<any>(sql, params); return new Map(rows.map((r) => [r.userId, this.to(r)])); } async getGlobalDefaults(userIds: string[]): Promise<Map<string, IdentityScope>> { if (!userIds.length) return new Map(); const rows = this.db.all<any>(`SELECT * FROM "IdentityScope" WHERE scope = 'GLOBAL_DEFAULT' AND userId IN (${userIds.map(() => '?').join(',')})`, userIds); return new Map(rows.map((r) => [r.userId, this.to(r)])); } private to(row: any): IdentityScope { return { userId: row.userId, scopeType: row.scope === 'CIRVIA' ? 'CIRVIA' : row.scope === 'CHAT_1TO1' ? 'CHAT_1TO1' : 'GLOBAL_DEFAULT', scopeId: row.cirviaId ?? null, identityLevel: row.identityLevel ?? 'ANONYMOUS', showAgeRange: Boolean(row.showAgeRange), showGender: Boolean(row.showGender), showCity: Boolean(row.showCity), showState: Boolean(row.showState), showBio: Boolean(row.showBio), showProfilePhoto: Boolean(row.showProfilePhoto), customAvatarKey: row.customAvatarKey ?? undefined }; } }
class PassthroughAvatarSigner implements AvatarSigner { async toSignedUrl(key: string): Promise<string> { return key; } }

@Injectable()
export class ChatService {
  private readonly identityResolver: IdentityResolverService;
  constructor(private readonly db: PrismaService, private readonly redis: ChatRedisService) {
    this.identityResolver = new IdentityResolverService(new DbProfileRepository(db), new DbIdentityScopeRepository(db), new PassthroughAvatarSigner());
  }

  async assertChatAccess(chatId: string, userId: string) {
    const participant = this.db.get('SELECT id FROM "ChatParticipant" WHERE chatId = ? AND userId = ?', [chatId, userId]);
    if (participant) return;
    const byCirvia = this.db.get<any>('SELECT c.id FROM "Chat" c JOIN "CirviaMember" m ON m.cirviaId = c.cirviaId WHERE c.id = ? AND m.userId = ? AND m.status IN (\'ACTIVE\',\'MUTED\')', [chatId, userId]);
    if (!byCirvia) throw new ForbiddenException('User has no access to chat');
  }

  async getMyChats(userId: string) {
    const rows = this.db.all<any>(
      `SELECT DISTINCT c.* FROM "Chat" c LEFT JOIN "ChatParticipant" cp ON cp.chatId = c.id LEFT JOIN "CirviaMember" cm ON cm.cirviaId = c.cirviaId
       WHERE (cp.userId = ? OR (cm.userId = ? AND cm.status IN ('ACTIVE','MUTED'))) AND c.isDeleted = 0 ORDER BY c.updatedAt DESC`,
      [userId, userId],
    );

    return Promise.all(rows.map(async (chat) => {
      const lastMessage = this.db.get<any>('SELECT id, createdAt, isDeleted FROM "Message" WHERE chatId = ? ORDER BY createdAt DESC LIMIT 1', [chat.id]);
      const unread = this.db.get<any>('SELECT COUNT(*) as count FROM "Message" m LEFT JOIN "MessageReadReceipt" r ON r.messageId = m.id AND r.userId = ? WHERE m.chatId = ? AND m.senderId <> ? AND r.id IS NULL AND m.isDeleted = 0', [userId, chat.id, userId]);
      const ids = this.db.all<any>('SELECT userId FROM "ChatParticipant" WHERE chatId = ? AND userId <> ?', [chat.id, userId]).map((r) => r.userId);
      const scope = chat.type === 'CIRVIA_GROUP' ? { scopeType: 'CIRVIA', scopeId: chat.cirviaId } as const : { scopeType: 'CHAT_1TO1', scopeId: chat.id } as const;
      const identities = await this.identityResolver.resolveIdentityBulk(userId, ids, scope);
      return { ...chat, identities: [...identities.values()], lastMessagePreview: lastMessage ? { id: lastMessage.id, createdAt: lastMessage.createdAt, previewText: '[new message]' } : null, unreadCount: unread?.count ?? 0 };
    }));
  }

  async getChatMessages(chatId: string, query: ChatMessagesQueryDto, userId: string) {
    await this.assertChatAccess(chatId, userId);
    const chat = this.db.get<any>('SELECT * FROM "Chat" WHERE id = ?', [chatId]);
    if (!chat) throw new NotFoundException('Chat not found');
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    const op = query.before === false ? '>' : '<';
    const cursorSql = query.cursor ? ` AND createdAt ${op} ? ` : '';
    const params = query.cursor ? [chatId, query.cursor, limit] : [chatId, limit];
    const rows = this.db.all<any>(`SELECT * FROM "Message" WHERE chatId = ? ${cursorSql} ORDER BY createdAt DESC LIMIT ?`, params);
    const identityMap = await this.identityResolver.resolveIdentityBulk(userId, rows.map((r) => r.senderId), chat.type === 'CIRVIA_GROUP' ? { scopeType: 'CIRVIA', scopeId: chat.cirviaId } : { scopeType: 'CHAT_1TO1', scopeId: chat.id });
    return rows.map((m) => ({ message: m, sender: identityMap.get(m.senderId) }));
  }

  async createOneToOneChat(dto: CreateOneToOneChatDto, userId: string) {
    if (dto.otherUserId === userId) throw new BadRequestException('Cannot chat with yourself');
    const existing = this.db.get<any>(`SELECT c.id FROM "Chat" c JOIN "ChatParticipant" a ON a.chatId = c.id AND a.userId = ? JOIN "ChatParticipant" b ON b.chatId = c.id AND b.userId = ? WHERE c.type = 'ONE_TO_ONE' LIMIT 1`, [userId, dto.otherUserId]);
    const chatId = existing?.id ?? randomUUID();
    if (!existing) {
      this.db.transaction(() => {
        this.db.run('INSERT INTO "Chat" (id,type,createdAt,updatedAt,isDeleted) VALUES (?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,0)', [chatId, 'ONE_TO_ONE']);
        this.db.run('INSERT INTO "ChatParticipant" (id,chatId,userId,createdAt) VALUES (?,?,?,CURRENT_TIMESTAMP)', [randomUUID(), chatId, userId]);
        this.db.run('INSERT INTO "ChatParticipant" (id,chatId,userId,createdAt) VALUES (?,?,?,CURRENT_TIMESTAMP)', [randomUUID(), chatId, dto.otherUserId]);
      });
    }
    const identity = await this.identityResolver.resolveIdentity(userId, dto.otherUserId, { scopeType: 'GLOBAL_DEFAULT', scopeId: null });
    return { id: chatId, type: 'ONE_TO_ONE', otherParticipant: identity };
  }

  async sendMessage(dto: SendMessageDto, userId: string) {
    if (await this.redis.hitRateLimit(userId, 10, 60)) throw new ForbiddenException('Rate limit exceeded');
    await this.assertChatAccess(dto.chatId, userId);
    const chat = this.db.get<any>('SELECT * FROM "Chat" WHERE id = ?', [dto.chatId]);
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.type === 'CIRVIA_GROUP') {
      const muted = this.db.get<any>('SELECT mutedUntil FROM "CirviaMember" WHERE cirviaId = ? AND userId = ?', [chat.cirviaId, userId]);
      if (muted?.mutedUntil && new Date(muted.mutedUntil).getTime() > Date.now()) throw new ForbiddenException('User is muted');
    }
    const id = randomUUID();
    this.db.run('INSERT INTO "Message" (id,chatId,senderId,contentText,mediaKeys,createdAt,updatedAt,isDeleted) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,0)', [id, dto.chatId, userId, dto.contentText, dto.mediaKeys ? JSON.stringify(dto.mediaKeys) : null]);
    this.db.run('UPDATE "Chat" SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [dto.chatId]);
    const message = this.db.get<any>('SELECT * FROM "Message" WHERE id = ?', [id]);
    const sender = await this.identityResolver.resolveIdentity(userId, userId, chat.type === 'CIRVIA_GROUP' ? { scopeType: 'CIRVIA', scopeId: chat.cirviaId } : { scopeType: 'CHAT_1TO1', scopeId: chat.id });
    safeLog('info', 'socket.send-message', { userId, chatId: dto.chatId, messageId: id });
    return { message, sender };
  }

  async markMessageRead(messageId: string, userId: string) {
    const message = this.db.get<any>('SELECT * FROM "Message" WHERE id = ?', [messageId]);
    if (!message) throw new NotFoundException('Message not found');
    await this.assertChatAccess(message.chatId, userId);
    const existing = this.db.get('SELECT id FROM "MessageReadReceipt" WHERE messageId = ? AND userId = ?', [messageId, userId]);
    if (!existing) this.db.run('INSERT INTO "MessageReadReceipt" (id,messageId,userId,createdAt) VALUES (?,?,?,CURRENT_TIMESTAMP)', [randomUUID(), messageId, userId]);
    return { messageId, readBy: userId, senderId: message.senderId, chatId: message.chatId };
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = this.db.get<any>('SELECT * FROM "Message" WHERE id = ?', [messageId]);
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Only sender can delete');
    this.db.run('UPDATE "Message" SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [messageId]);
    return { messageId, chatId: message.chatId };
  }
}
