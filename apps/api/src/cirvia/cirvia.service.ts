import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { AuditLogService } from '../audit/audit-log.service';
import { IdentityScopeRepository, ProfileRepository, AvatarSigner } from '../identity-scope/repositories';
import { IdentityResolverService } from '../identity-scope/services/IdentityResolverService';
import { IdentityScope, Profile, ResolvedIdentityDTO, ScopeType } from '../identity-scope/types';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BanMemberDto,
  CreateCirviaDto,
  CreateInviteDto,
  DiscoveryQueryDto,
  JoinCirviaDto,
  MuteMemberDto,
  UpdateMemberRoleDto,
} from './dto/cirvia.dto';
import { hasRoleAtLeast } from './cirvia.types';

type Actor = { userId: string };
type MemberRow = { role: string; status: string };

class DbProfileRepository implements ProfileRepository {
  constructor(private readonly db: PrismaService) {}

  async getByUserId(userId: string): Promise<Profile | null> {
    const user = this.db.get<{ id: string; email: string }>('SELECT id, email FROM "User" WHERE id = ?', [userId]);
    if (!user) {
      return null;
    }

    return this.toProfile(user);
  }

  async getByUserIds(userIds: string[]): Promise<Map<string, Profile>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = this.db.all<{ id: string; email: string }>(
      `SELECT id, email FROM "User" WHERE id IN (${placeholders})`,
      userIds,
    );

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
    if (scopeType === 'GLOBAL_DEFAULT') {
      return this.getGlobalDefault(userId);
    }

    if (scopeType !== 'CIRVIA' || !scopeId) {
      return null;
    }

    const row = this.db.get<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope"
       WHERE userId = ? AND cirviaId = ? AND scope = ?`,
      [userId, scopeId, 'CIRVIA'],
    );

    return row ? this.toIdentityScope(row) : null;
  }

  async getGlobalDefault(userId: string): Promise<IdentityScope | null> {
    const row = this.db.get<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope"
       WHERE userId = ? AND scope = ?
       LIMIT 1`,
      [userId, 'GLOBAL_DEFAULT'],
    );

    return row ? this.toIdentityScope(row) : null;
  }

  async createGlobalDefaultAnonymous(userId: string): Promise<IdentityScope> {
    this.db.run(
      `INSERT INTO "IdentityScope" (
        id, userId, cirviaId, scope, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [randomUUID(), userId, null, 'GLOBAL_DEFAULT', 'ANONYMOUS', 0, 0, 0, 0, 0, 0, null],
    );

    return this.toIdentityScope({ userId, cirviaId: null });
  }

  async getByUsersAndScope(userIds: string[], scopeType: ScopeType, scopeId: string | null): Promise<Map<string, IdentityScope>> {
    if (userIds.length === 0 || scopeType !== 'CIRVIA' || !scopeId) {
      return new Map();
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = this.db.all<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope"
       WHERE scope = 'CIRVIA' AND cirviaId = ? AND userId IN (${placeholders})`,
      [scopeId, ...userIds],
    );

    return new Map(rows.map((row) => [row.userId, this.toIdentityScope(row)]));
  }

  async getGlobalDefaults(userIds: string[]): Promise<Map<string, IdentityScope>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = this.db.all<any>(
      `SELECT userId, cirviaId, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey
       FROM "IdentityScope"
       WHERE scope = 'GLOBAL_DEFAULT' AND userId IN (${placeholders})`,
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

class PassthroughAvatarSigner implements AvatarSigner {
  async toSignedUrl(key: string): Promise<string> {
    return key;
  }
}

@Injectable()
export class CirviaService {
  private readonly identityResolver: IdentityResolverService;

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationService,
  ) {
    this.identityResolver = new IdentityResolverService(
      new DbProfileRepository(this.db),
      new DbIdentityScopeRepository(this.db),
      new PassthroughAvatarSigner(),
    );
  }

  async create(dto: CreateCirviaDto, actor: Actor) {
    this.validateCreateInput(dto);

    const duplicate = this.db.get('SELECT id FROM "Cirvia" WHERE name = ? AND deletedAt IS NULL', [dto.name]);
    if (duplicate) {
      throw new BadRequestException('Cirvia name already exists');
    }

    const cirviaId = randomUUID();

    this.db.transaction(() => {
      this.db.run(
        `INSERT INTO "Cirvia" (id, name, description, visibility, requireApproval, maxMembers, createdById, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [cirviaId, dto.name, dto.description, dto.visibility, dto.requireApproval ? 1 : 0, dto.maxMembers ?? null, actor.userId],
      );

      this.db.run(
        `INSERT INTO "CirviaMember" (id, cirviaId, userId, role, status, joinedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [randomUUID(), cirviaId, actor.userId, 'OWNER', 'ACTIVE'],
      );

      this.db.run(
        'INSERT INTO "CirviaChat" (id, cirviaId, createdAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [randomUUID(), cirviaId],
      );

      this.ensureIdentityScope(actor.userId, cirviaId);
      this.ensureGlobalDefaultScope(actor.userId);
    });

    const cirvia = this.db.get('SELECT * FROM "Cirvia" WHERE id = ?', [cirviaId]);
    const creatorIdentity = await this.identityResolver.resolveIdentity(actor.userId, actor.userId, {
      scopeType: 'CIRVIA',
      scopeId: cirviaId,
    });

    this.audit.log('cirvia.create', { cirviaId, actorUserId: actor.userId });

    return {
      ...cirvia,
      creatorIdentity,
    };
  }

  async listPublic(query: DiscoveryQueryDto, actor: Actor) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);

    const rows = this.db.all<any>(
      `SELECT * FROM "Cirvia"
       WHERE visibility = ?
         AND deletedAt IS NULL
         AND name LIKE ?
       ORDER BY updatedAt DESC
       LIMIT ? OFFSET ?`,
      ['PUBLIC', `%${query.search ?? ''}%`, pageSize, (page - 1) * pageSize],
    );

    return rows
      .filter((row) => {
        if (!query.joined) {
          return true;
        }

        const joined = Boolean(
          this.db.get(
            `SELECT 1
             FROM "CirviaMember"
             WHERE cirviaId = ? AND userId = ? AND status IN ('ACTIVE', 'MUTED')`,
            [row.id, actor.userId],
          ),
        );

        if (query.joined === 'joined') {
          return joined;
        }

        if (query.joined === 'not_joined') {
          return !joined;
        }

        return true;
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        visibility: row.visibility,
        memberCount: this.countActiveMembers(row.id),
        recentActivity: row.updatedAt,
      }));
  }

  async listMy(actor: Actor) {
    return this.db.all<any>(
      `SELECT c.id, c.name, c.visibility, m.role, m.status
       FROM "CirviaMember" m
       JOIN "Cirvia" c ON c.id = m.cirviaId
       WHERE m.userId = ?
         AND m.status <> ?
         AND c.deletedAt IS NULL`,
      [actor.userId, 'REMOVED'],
    );
  }

  async getOne(cirviaId: string, actor: Actor) {
    const cirvia = this.db.get<any>('SELECT * FROM "Cirvia" WHERE id = ? AND deletedAt IS NULL', [cirviaId]);
    if (!cirvia) {
      throw new NotFoundException('Cirvia not found');
    }

    const myMembership = this.db.get<MemberRow>(
      'SELECT role, status FROM "CirviaMember" WHERE cirviaId = ? AND userId = ? AND status <> ?',
      [cirviaId, actor.userId, 'REMOVED'],
    );

    if (cirvia.visibility === 'PRIVATE' && !myMembership) {
      throw new ForbiddenException('Private cirvia requires membership');
    }

    const currentUserIdentityScope = await this.identityResolver.getUserIdentityScope(actor.userId, 'CIRVIA', cirviaId);

    return {
      id: cirvia.id,
      name: cirvia.name,
      description: cirvia.description,
      visibility: cirvia.visibility,
      requireApproval: Boolean(cirvia.requireApproval),
      maxMembers: cirvia.maxMembers,
      memberCount: this.countActiveMembers(cirviaId),
      currentUserRole: myMembership?.role ?? null,
      currentUserIdentityScope,
    };
  }

  async listMembers(cirviaId: string, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'MEMBER');

    const members = this.db.all<any>(
      `SELECT userId, role, status, mutedUntil, joinedAt, updatedAt
       FROM "CirviaMember"
       WHERE cirviaId = ? AND status <> 'REMOVED'
       ORDER BY joinedAt ASC`,
      [cirviaId],
    );

    const identityMap = await this.resolveIdentitiesForCirvia(
      actor.userId,
      cirviaId,
      members.map((member) => member.userId),
    );

    return members.map((member) => ({
      userId: member.userId,
      membership: {
        role: member.role,
        status: member.status,
        mutedUntil: member.mutedUntil,
        joinedAt: member.joinedAt,
        updatedAt: member.updatedAt,
      },
      identity: identityMap.get(member.userId),
    }));
  }

  async resolveIdentitiesForCirvia(
    viewerUserId: string,
    cirviaId: string,
    subjectUserIds: string[],
  ): Promise<Map<string, ResolvedIdentityDTO>> {
    return this.identityResolver.resolveIdentityBulk(viewerUserId, subjectUserIds, {
      scopeType: 'CIRVIA',
      scopeId: cirviaId,
    });
  }

  async createInvite(cirviaId: string, dto: CreateInviteDto, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'ADMIN');

    const cirvia = this.getCirviaOrThrow(cirviaId);

    const expiresAt = new Date(dto.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new BadRequestException('expiresAt must be a valid future date');
    }

    if (dto.maxUses !== undefined && dto.maxUses !== null && dto.maxUses <= 0) {
      throw new BadRequestException('maxUses must be greater than 0');
    }

    const inviteCode = this.generateUniqueInviteCode();
    const inviteId = randomUUID();

    this.db.run(
      `INSERT INTO "CirviaInvite" (id, cirviaId, inviteCode, createdById, expiresAt, maxUses, usesCount, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)`,
      [inviteId, cirviaId, inviteCode, actor.userId, expiresAt.toISOString(), dto.maxUses ?? null],
    );

    this.audit.log('cirvia.invite.create', {
      cirviaId,
      inviteId,
      inviteCode,
      actorUserId: actor.userId,
      cirviaName: cirvia.name,
    });

    return {
      id: inviteId,
      cirviaId,
      inviteCode,
      inviteLink: `https://mycirvia.com/join/${inviteCode}`,
      expiresAt: expiresAt.toISOString(),
      maxUses: dto.maxUses ?? null,
    };
  }

  async join(dto: JoinCirviaDto, actor: Actor) {
    const invite = this.db.get<any>(
      `SELECT i.*, c.requireApproval, c.maxMembers
       FROM "CirviaInvite" i
       JOIN "Cirvia" c ON c.id = i.cirviaId
       WHERE i.inviteCode = ?`,
      [dto.inviteCode],
    );

    if (!invite || !invite.isActive) {
      throw new BadRequestException('Invite code is invalid');
    }

    if (new Date(invite.expiresAt) < new Date()) {
      throw new BadRequestException('Invite code expired');
    }

    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      throw new BadRequestException('Invite code exhausted');
    }

    if (invite.maxMembers !== null && this.countActiveMembers(invite.cirviaId) >= invite.maxMembers) {
      throw new BadRequestException('Cirvia is full');
    }

    const status = invite.requireApproval ? 'PENDING' : 'ACTIVE';

    this.db.transaction(() => {
      this.db.run('UPDATE "CirviaInvite" SET usesCount = usesCount + 1 WHERE id = ?', [invite.id]);

      const existingMembership = this.db.get('SELECT id FROM "CirviaMember" WHERE cirviaId = ? AND userId = ?', [
        invite.cirviaId,
        actor.userId,
      ]);

      if (existingMembership) {
        this.db.run(
          'UPDATE "CirviaMember" SET status = ?, role = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?',
          [status, 'MEMBER', invite.cirviaId, actor.userId],
        );
      } else {
        this.db.run(
          `INSERT INTO "CirviaMember" (id, cirviaId, userId, role, status, joinedAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [randomUUID(), invite.cirviaId, actor.userId, 'MEMBER', status],
        );
      }

      this.ensureIdentityScope(actor.userId, invite.cirviaId);
      this.ensureGlobalDefaultScope(actor.userId);
    });

    if (status === 'PENDING') {
      this.notifications.notifyCirviaAdmins(invite.cirviaId, {
        type: 'cirvia.membership.pending',
        userId: actor.userId,
      });
    }

    this.audit.log('cirvia.join', {
      cirviaId: invite.cirviaId,
      actorUserId: actor.userId,
      inviteCode: dto.inviteCode,
      status,
    });

    return {
      cirviaId: invite.cirviaId,
      status,
    };
  }

  async approveMember(cirviaId: string, userId: string, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'ADMIN');

    const target = this.getMemberOrThrow(cirviaId, userId);
    if (target.status === 'REMOVED') {
      throw new BadRequestException('Cannot approve removed member');
    }

    this.db.run(
      'UPDATE "CirviaMember" SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?',
      ['ACTIVE', cirviaId, userId],
    );

    this.notifications.notifyUser(userId, { type: 'cirvia.membership.approved', cirviaId });
    this.audit.log('cirvia.member.approve', { cirviaId, userId, actorUserId: actor.userId });

    return { cirviaId, userId, status: 'ACTIVE' };
  }

  async kickMember(cirviaId: string, userId: string, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'ADMIN');
    this.assertTargetNotOwner(cirviaId, userId);

    this.db.run(
      'UPDATE "CirviaMember" SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?',
      ['REMOVED', cirviaId, userId],
    );

    this.audit.log('cirvia.member.kick', { cirviaId, userId, actorUserId: actor.userId });

    return { cirviaId, userId, status: 'REMOVED' };
  }

  async banMember(cirviaId: string, userId: string, dto: BanMemberDto, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'ADMIN');
    this.assertTargetNotOwner(cirviaId, userId);

    const mutedUntil = dto.duration ? new Date(Date.now() + dto.duration * 60_000).toISOString() : null;

    this.db.run(
      'UPDATE "CirviaMember" SET status = ?, mutedUntil = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?',
      ['BANNED', mutedUntil, cirviaId, userId],
    );

    this.audit.log('cirvia.member.ban', {
      cirviaId,
      userId,
      actorUserId: actor.userId,
      reason: dto.reason,
      mutedUntil,
    });

    return { cirviaId, userId, status: 'BANNED', mutedUntil };
  }

  async muteMember(cirviaId: string, userId: string, dto: MuteMemberDto, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'MODERATOR');
    this.assertTargetNotOwner(cirviaId, userId);

    const mutedUntil = new Date(Date.now() + dto.duration * 60_000).toISOString();

    this.db.run(
      'UPDATE "CirviaMember" SET status = ?, mutedUntil = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?',
      ['MUTED', mutedUntil, cirviaId, userId],
    );

    this.audit.log('cirvia.member.mute', { cirviaId, userId, actorUserId: actor.userId, mutedUntil });

    return { cirviaId, userId, status: 'MUTED', mutedUntil };
  }

  async unmuteMember(cirviaId: string, userId: string, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'MODERATOR');
    this.assertTargetNotOwner(cirviaId, userId);

    this.db.run(
      'UPDATE "CirviaMember" SET status = ?, mutedUntil = NULL, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?',
      ['ACTIVE', cirviaId, userId],
    );

    this.audit.log('cirvia.member.unmute', { cirviaId, userId, actorUserId: actor.userId });

    return { cirviaId, userId, status: 'ACTIVE' };
  }

  async updateRole(cirviaId: string, userId: string, dto: UpdateMemberRoleDto, actor: Actor) {
    this.requireRole(cirviaId, actor.userId, 'OWNER');

    const member = this.getMemberOrThrow(cirviaId, userId);

    if (actor.userId === userId && dto.role !== 'OWNER') {
      const owners = this.db.get<{ count: number }>(
        'SELECT COUNT(*) AS count FROM "CirviaMember" WHERE cirviaId = ? AND role = ? AND status = ?',
        [cirviaId, 'OWNER', 'ACTIVE'],
      )?.count;

      if (!owners || owners <= 1) {
        throw new BadRequestException('Cannot change own role when you are the only OWNER');
      }
    }

    if (member.status === 'REMOVED') {
      throw new BadRequestException('Cannot update role for removed member');
    }

    this.db.run(
      'UPDATE "CirviaMember" SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE cirviaId = ? AND userId = ?',
      [dto.role, cirviaId, userId],
    );

    this.audit.log('cirvia.member.role.update', {
      cirviaId,
      userId,
      actorUserId: actor.userId,
      role: dto.role,
    });

    return { cirviaId, userId, role: dto.role };
  }

  private validateCreateInput(dto: CreateCirviaDto): void {
    if (!dto.name || dto.name.trim().length < 3) {
      throw new BadRequestException('name must be at least 3 characters');
    }

    if (dto.maxMembers !== undefined && dto.maxMembers !== null && dto.maxMembers <= 0) {
      throw new BadRequestException('maxMembers must be greater than 0');
    }
  }

  private getCirviaOrThrow(cirviaId: string) {
    const row = this.db.get<{ id: string; name: string }>('SELECT id, name FROM "Cirvia" WHERE id = ? AND deletedAt IS NULL', [
      cirviaId,
    ]);

    if (!row) {
      throw new NotFoundException('Cirvia not found');
    }

    return row;
  }

  private getMemberOrThrow(cirviaId: string, userId: string): MemberRow {
    const member = this.db.get<MemberRow>('SELECT role, status FROM "CirviaMember" WHERE cirviaId = ? AND userId = ?', [
      cirviaId,
      userId,
    ]);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  private assertTargetNotOwner(cirviaId: string, userId: string): void {
    const target = this.getMemberOrThrow(cirviaId, userId);
    if (target.role === 'OWNER') {
      throw new ForbiddenException('Cannot act on OWNER');
    }
  }

  private requireRole(cirviaId: string, userId: string, minimumRole: string): void {
    const member = this.getMemberOrThrow(cirviaId, userId);

    if (!hasRoleAtLeast(member.role, minimumRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    if (!['ACTIVE', 'MUTED'].includes(member.status)) {
      throw new ForbiddenException('Membership not active');
    }
  }

  private countActiveMembers(cirviaId: string): number {
    return (
      this.db.get<{ count: number }>(
        'SELECT COUNT(*) AS count FROM "CirviaMember" WHERE cirviaId = ? AND status IN (\'ACTIVE\', \'MUTED\')',
        [cirviaId],
      )?.count ?? 0
    );
  }

  private generateUniqueInviteCode(): string {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
      const existing = this.db.get('SELECT id FROM "CirviaInvite" WHERE inviteCode = ?', [code]);
      if (!existing) {
        return code;
      }
    }

    throw new BadRequestException('Unable to generate invite code');
  }

  private ensureIdentityScope(userId: string, cirviaId: string): void {
    const existing = this.db.get(
      'SELECT id FROM "IdentityScope" WHERE userId = ? AND cirviaId = ? AND scope = ?',
      [userId, cirviaId, 'CIRVIA'],
    );

    if (!existing) {
      this.db.run(
        `INSERT INTO "IdentityScope" (
          id, userId, cirviaId, scope, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, cirviaId, 'CIRVIA', 'ANONYMOUS', 0, 0, 0, 0, 0, 0, null],
      );
    }
  }

  private ensureGlobalDefaultScope(userId: string): void {
    const existing = this.db.get('SELECT id FROM "IdentityScope" WHERE userId = ? AND scope = ?', [
      userId,
      'GLOBAL_DEFAULT',
    ]);

    if (!existing) {
      this.db.run(
        `INSERT INTO "IdentityScope" (
          id, userId, cirviaId, scope, identityLevel, showAgeRange, showGender, showCity, showState, showBio, showProfilePhoto, customAvatarKey, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [randomUUID(), userId, null, 'GLOBAL_DEFAULT', 'ANONYMOUS', 0, 0, 0, 0, 0, 0, null],
      );
    }
  }
}
