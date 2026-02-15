import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { IdentityResolverService } from '../identity-scope/services/IdentityResolverService';
import { AvatarSigner, IdentityScopeRepository, ProfileRepository } from '../identity-scope/repositories';
import { IdentityScope, Profile, ScopeType } from '../identity-scope/types';
import { BanMemberDto, CreateCirviaDto, CreateInviteDto, DiscoveryQueryDto, JoinCirviaDto, MuteMemberDto, UpdateMemberRoleDto } from './dto/cirvia.dto';
import { hasRoleAtLeast } from './cirvia.types';

type Actor = { userId: string };

class DbProfileRepository implements ProfileRepository {
  constructor(private readonly db: PrismaService) {}
  async getByUserId(userId: string): Promise<Profile | null> {
    const user = this.db.get<{ id: string; email: string }>('SELECT id, email FROM "User" WHERE id = ?', [userId]);
    return user ? this.toProfile(user) : null;
  }
  async getByUserIds(userIds: string[]): Promise<Map<string, Profile>> {
    if (userIds.length === 0) return new Map();
    const rows = this.db.all<{ id: string; email: string }>(`SELECT id, email FROM "User" WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds);
    return new Map(rows.map((r) => [r.id, this.toProfile(r)]));
  }
  private toProfile(user: { id: string; email: string }): Profile {
    const name = user.email.split('@')[0];
    return { userId: user.id, abstractName: `user-${user.id.slice(0, 6)}`, chosenName: name, realName: name, abstractAvatarKey: `avatar/${user.id}` };
  }
}

class DbIdentityScopeRepository implements IdentityScopeRepository {
  constructor(private readonly db: PrismaService) {}
  async getByUserAndScope(userId: string, scopeType: ScopeType, scopeId: string | null): Promise<IdentityScope | null> {
    if (scopeType === 'GLOBAL_DEFAULT') return this.getGlobalDefault(userId);
    if (scopeType !== 'CIRVIA' || !scopeId) return null;
    const row = this.db.get<{ userId: string; cirviaId: string }>('SELECT userId, cirviaId FROM "IdentityScope" WHERE userId = ? AND cirviaId = ? AND scope = ?', [userId, scopeId, 'CIRVIA']);
    return row ? this.toScope(row.userId, row.cirviaId) : null;
  }
  async getGlobalDefault(userId: string): Promise<IdentityScope | null> {
    const row = this.db.get<{ userId: string }>('SELECT userId FROM "IdentityScope" WHERE userId = ? AND scope = ? LIMIT 1', [userId, 'GLOBAL_DEFAULT']);
    return row ? this.toScope(row.userId, null) : null;
  }
  async createGlobalDefaultAnonymous(userId: string): Promise<IdentityScope> {
    this.db.run('INSERT INTO "IdentityScope" (id, userId, cirviaId, scope, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', [randomUUID(), userId, null, 'GLOBAL_DEFAULT']);
    return this.toScope(userId, null);
  }
  async getByUsersAndScope(userIds: string[], scopeType: ScopeType, scopeId: string | null): Promise<Map<string, IdentityScope>> {
    if (scopeType !== 'CIRVIA' || !scopeId || userIds.length === 0) return new Map();
    const rows = this.db.all<{ userId: string; cirviaId: string }>(`SELECT userId, cirviaId FROM "IdentityScope" WHERE scope = 'CIRVIA' AND cirviaId = ? AND userId IN (${userIds.map(() => '?').join(',')})`, [scopeId, ...userIds]);
    return new Map(rows.map((r) => [r.userId, this.toScope(r.userId, r.cirviaId)]));
  }
  async getGlobalDefaults(userIds: string[]): Promise<Map<string, IdentityScope>> {
    if (userIds.length === 0) return new Map();
    const rows = this.db.all<{ userId: string }>(`SELECT userId FROM "IdentityScope" WHERE scope = 'GLOBAL_DEFAULT' AND userId IN (${userIds.map(() => '?').join(',')})`, userIds);
    return new Map(rows.map((r) => [r.userId, this.toScope(r.userId, null)]));
  }
  private toScope(userId: string, scopeId: string | null): IdentityScope {
    return { userId, scopeType: scopeId ? 'CIRVIA' : 'GLOBAL_DEFAULT', scopeId, identityLevel: 'ANONYMOUS', showAgeRange: false, showGender: false, showCity: false, showState: false, showBio: false, showProfilePhoto: false };
  }
}
class PassthroughAvatarSigner implements AvatarSigner { async toSignedUrl(key: string) { return key; } }

@Injectable()
export class CirviaService {
  private readonly identityResolver: IdentityResolverService;
  constructor(private readonly db: PrismaService, private readonly audit: AuditLogService, private readonly notifications: NotificationService) {
    this.identityResolver = new IdentityResolverService(new DbProfileRepository(db), new DbIdentityScopeRepository(db), new PassthroughAvatarSigner());
  }

  async create(dto: CreateCirviaDto, actor: Actor) {
    const existing = this.db.get('SELECT id FROM "Cirvia" WHERE name = ? AND deletedAt IS NULL', [dto.name]);
    if (existing) throw new BadRequestException('Cirvia name already exists');
    const id = randomUUID();
    this.db.transaction(() => {
      this.db.run('INSERT INTO "Cirvia" (id,name,description,visibility,requireApproval,maxMembers,createdById,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', [id, dto.name, dto.description, dto.visibility, dto.requireApproval ? 1 : 0, dto.maxMembers ?? null, actor.userId]);
      this.db.run('INSERT INTO "CirviaMember" (id,cirviaId,userId,role,status,joinedAt,updatedAt) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', [randomUUID(), id, actor.userId, 'OWNER', 'ACTIVE']);
      this.db.run('INSERT INTO "CirviaChat" (id,cirviaId,createdAt) VALUES (?,?,CURRENT_TIMESTAMP)', [randomUUID(), id]);
      this.ensureIdentityScope(actor.userId, id);
      this.ensureGlobalDefault(actor.userId);
    });
    const cirvia = this.db.get('SELECT * FROM "Cirvia" WHERE id = ?', [id]);
    const creatorIdentity = await this.identityResolver.resolveIdentity(actor.userId, actor.userId, { scopeType: 'CIRVIA', scopeId: id });
    this.audit.log('cirvia.create', { cirviaId: id, actorUserId: actor.userId });
    return { ...cirvia, creatorIdentity };
  }

  async listPublic(query: DiscoveryQueryDto, actor: Actor) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);
    const rows = this.db.all<any>('SELECT * FROM "Cirvia" WHERE visibility = ? AND deletedAt IS NULL AND name LIKE ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?', ['PUBLIC', `%${query.search ?? ''}%`, pageSize, (page - 1) * pageSize]);
    return rows
      .filter((c) => {
        const joined = !!this.db.get('SELECT 1 FROM "CirviaMember" WHERE cirviaId = ? AND userId = ? AND status IN (\'ACTIVE\',\'MUTED\')', [c.id, actor.userId]);
        if (query.joined === 'joined') return joined;
        if (query.joined === 'not_joined') return !joined;
        return true;
      })
      .map((c) => ({ ...c, memberCount: this.countMembers(c.id), recentActivity: c.updatedAt }));
  }

  async listMy(actor: Actor) {
    return this.db.all<any>('SELECT c.id, c.name, m.role, m.status FROM "CirviaMember" m JOIN "Cirvia" c ON c.id = m.cirviaId WHERE m.userId = ? AND m.status <> ?', [actor.userId, 'REMOVED']);
  }

  async getOne(id: string, actor: Actor) {
    const cirvia = this.db.get<any>('SELECT * FROM "Cirvia" WHERE id = ? AND deletedAt IS NULL', [id]);
    if (!cirvia) throw new NotFoundException('Cirvia not found');
    const me = this.db.get<any>('SELECT role,status FROM "CirviaMember" WHERE cirviaId = ? AND userId = ? AND status <> ?', [id, actor.userId, 'REMOVED']);
    if (cirvia.visibility === 'PRIVATE' && !me) throw new ForbiddenException('Private cirvia requires membership');
    return { ...cirvia, memberCount: this.countMembers(id), currentUserRole: me?.role ?? null, currentUserIdentityScope: await this.identityResolver.getUserIdentityScope(actor.userId, 'CIRVIA', id) };
  }

  async createInvite(cirviaId: string, dto: CreateInviteDto, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'ADMIN');
    const code = this.generateInviteCode();
    const id = randomUUID();
    this.db.run('INSERT INTO "CirviaInvite" (id,cirviaId,inviteCode,createdById,expiresAt,maxUses,usesCount,isActive,createdAt) VALUES (?,?,?,?,?,?,0,1,CURRENT_TIMESTAMP)', [id, cirviaId, code, actor.userId, dto.expiresAt, dto.maxUses ?? null]);
    this.audit.log('cirvia.invite.create', { cirviaId, inviteId: id, actorUserId: actor.userId });
    return { id, cirviaId, inviteCode: code, inviteLink: `https://mycirvia.com/join/${code}` };
  }

  async join(dto: JoinCirviaDto, actor: Actor) {
    const invite = this.db.get<any>('SELECT i.*, c.requireApproval FROM "CirviaInvite" i JOIN "Cirvia" c ON c.id = i.cirviaId WHERE i.inviteCode = ?', [dto.inviteCode]);
    if (!invite || !invite.isActive) throw new BadRequestException('Invite code is invalid');
    if (new Date(invite.expiresAt) < new Date()) throw new BadRequestException('Invite code expired');
    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) throw new BadRequestException('Invite code exhausted');
    const status = invite.requireApproval ? 'PENDING' : 'ACTIVE';
    this.db.transaction(() => {
      this.db.run('UPDATE "CirviaInvite" SET usesCount = usesCount + 1 WHERE id = ?', [invite.id]);
      const existing = this.db.get('SELECT id FROM "CirviaMember" WHERE cirviaId = ? AND userId = ?', [invite.cirviaId, actor.userId]);
      if (existing) {
        this.db.run('UPDATE "CirviaMember" SET status = ?, role = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?', [status, 'MEMBER', invite.cirviaId, actor.userId]);
      } else {
        this.db.run('INSERT INTO "CirviaMember" (id,cirviaId,userId,role,status,joinedAt,updatedAt) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)', [randomUUID(), invite.cirviaId, actor.userId, 'MEMBER', status]);
      }
      this.ensureIdentityScope(actor.userId, invite.cirviaId);
      this.ensureGlobalDefault(actor.userId);
    });
    if (status === 'PENDING') this.notifications.notifyCirviaAdmins(invite.cirviaId, { type: 'cirvia.membership.pending', userId: actor.userId });
    this.audit.log('cirvia.join', { cirviaId: invite.cirviaId, actorUserId: actor.userId, status });
    return { cirviaId: invite.cirviaId, status };
  }

  async approveMember(cirviaId: string, userId: string, actor: Actor) { this.requireRole(cirviaId, actor.userId, 'ADMIN'); this.db.run('UPDATE "CirviaMember" SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?', ['ACTIVE', cirviaId, userId]); this.notifications.notifyUser(userId, { type: 'cirvia.membership.approved', cirviaId }); this.audit.log('cirvia.member.approve', { cirviaId, userId, actorUserId: actor.userId }); return { status: 'ACTIVE' }; }
  async kickMember(cirviaId: string, userId: string, actor: Actor) { this.requireRole(cirviaId, actor.userId, 'ADMIN'); const target = this.getMember(cirviaId, userId); if (!target) throw new NotFoundException(); if (target.role === 'OWNER') throw new ForbiddenException('Owner cannot be kicked'); this.db.run('UPDATE "CirviaMember" SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?', ['REMOVED', cirviaId, userId]); this.audit.log('cirvia.member.kick', { cirviaId, userId, actorUserId: actor.userId }); return { status: 'REMOVED' }; }
  async banMember(cirviaId: string, userId: string, dto: BanMemberDto, actor: Actor) { this.requireRole(cirviaId, actor.userId, 'ADMIN'); const target = this.getMember(cirviaId, userId); if (!target) throw new NotFoundException(); if (target.role === 'OWNER') throw new ForbiddenException('Owner cannot be banned'); const until = dto.duration ? new Date(Date.now() + dto.duration * 60_000).toISOString() : null; this.db.run('UPDATE "CirviaMember" SET status = ?, mutedUntil = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?', ['BANNED', until, cirviaId, userId]); this.audit.log('cirvia.member.ban', { cirviaId, userId, actorUserId: actor.userId, reason: dto.reason, mutedUntil: until }); return { status: 'BANNED' }; }
  async muteMember(cirviaId: string, userId: string, dto: MuteMemberDto, actor: Actor) { this.requireRole(cirviaId, actor.userId, 'MODERATOR'); const until = new Date(Date.now() + dto.duration * 60_000).toISOString(); this.db.run('UPDATE "CirviaMember" SET status = ?, mutedUntil = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?', ['MUTED', until, cirviaId, userId]); this.audit.log('cirvia.member.mute', { cirviaId, userId, actorUserId: actor.userId, mutedUntil: until }); return { status: 'MUTED' }; }
  async unmuteMember(cirviaId: string, userId: string, actor: Actor) { this.requireRole(cirviaId, actor.userId, 'MODERATOR'); this.db.run('UPDATE "CirviaMember" SET status = ?, mutedUntil = NULL, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?', ['ACTIVE', cirviaId, userId]); this.audit.log('cirvia.member.unmute', { cirviaId, userId, actorUserId: actor.userId }); return { status: 'ACTIVE' }; }
  async updateRole(cirviaId: string, userId: string, dto: UpdateMemberRoleDto, actor: Actor) { this.requireRole(cirviaId, actor.userId, 'OWNER'); if (actor.userId === userId && dto.role !== 'OWNER') { const owners = this.db.get<any>('SELECT COUNT(*) as count FROM "CirviaMember" WHERE cirviaId = ? AND role = ? AND status = ?', [cirviaId, 'OWNER', 'ACTIVE'])?.count ?? 0; if (owners <= 1) throw new BadRequestException('Cannot demote only owner'); } this.db.run('UPDATE "CirviaMember" SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?', [dto.role, cirviaId, userId]); this.audit.log('cirvia.member.role.update', { cirviaId, userId, actorUserId: actor.userId, role: dto.role }); return { role: dto.role }; }

  private generateInviteCode() { return randomBytes(6).toString('base64url').slice(0, 8).toUpperCase(); }
  private countMembers(cirviaId: string) { return this.db.get<any>('SELECT COUNT(*) as count FROM "CirviaMember" WHERE cirviaId = ? AND status <> ?', [cirviaId, 'REMOVED'])?.count ?? 0; }
  private getMember(cirviaId: string, userId: string) { return this.db.get<any>('SELECT role,status FROM "CirviaMember" WHERE cirviaId = ? AND userId = ?', [cirviaId, userId]); }
  private requireRole(cirviaId: string, userId: string, minimum: string) { const member = this.getMember(cirviaId, userId); if (!member) throw new ForbiddenException('Membership required'); if (!hasRoleAtLeast(member.role, minimum)) throw new ForbiddenException('Insufficient role'); if (!['ACTIVE', 'MUTED'].includes(member.status)) throw new ForbiddenException('Membership not active'); }
  private ensureIdentityScope(userId: string, cirviaId: string) { const exists = this.db.get('SELECT id FROM "IdentityScope" WHERE userId = ? AND cirviaId = ? AND scope = ?', [userId, cirviaId, 'CIRVIA']); if (!exists) this.db.run('INSERT INTO "IdentityScope" (id,userId,cirviaId,scope,createdAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP)', [randomUUID(), userId, cirviaId, 'CIRVIA']); }
  private ensureGlobalDefault(userId: string) { const exists = this.db.get('SELECT id FROM "IdentityScope" WHERE userId = ? AND scope = ?', [userId, 'GLOBAL_DEFAULT']); if (!exists) this.db.run('INSERT INTO "IdentityScope" (id,userId,cirviaId,scope,createdAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP)', [randomUUID(), userId, null, 'GLOBAL_DEFAULT']); }
}
