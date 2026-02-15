import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomInviteCode(length = 8): string {
  return Array.from({ length }, () => ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]).join('');
}

async function createUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 20; i += 1) {
    const inviteCode = randomInviteCode();
    const exists = await prisma.cirviaInvite.findUnique({ where: { inviteCode }, select: { id: true } });
    if (!exists) return inviteCode;
  }
  throw new Error('Unable to generate unique invite code.');
}

async function main() {
  await prisma.identityScope.deleteMany();
  await prisma.cirviaMember.deleteMany();
  await prisma.cirviaInvite.deleteMany();
  await prisma.cirviaChat.deleteMany();
  await prisma.cirvia.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({ data: { email: 'owner@cirvia.test' } }),
    prisma.user.create({ data: { email: 'admin@cirvia.test' } }),
    prisma.user.create({ data: { email: 'mod@cirvia.test' } }),
    prisma.user.create({ data: { email: 'member@cirvia.test' } }),
    prisma.user.create({ data: { email: 'guest@cirvia.test' } })
  ]);

  const [owner, admin, moderator, member, guest] = users;

  const cirvias = await Promise.all([
    prisma.cirvia.create({
      data: {
        name: 'Cirvia Public Hub',
        description: 'Public Cirvia for platform discovery and onboarding.',
        visibility: 'PUBLIC',
        requireApproval: true,
        maxMembers: null,
        createdById: owner.id
      }
    }),
    prisma.cirvia.create({
      data: {
        name: 'Cirvia Private Ops',
        description: 'Private operations Cirvia with tighter moderation policies.',
        visibility: 'PRIVATE',
        requireApproval: true,
        maxMembers: 25,
        createdById: admin.id
      }
    }),
    prisma.cirvia.create({
      data: {
        name: 'Cirvia Private Social',
        description: 'Invite-only social Cirvia for close collaborators.',
        visibility: 'PRIVATE',
        requireApproval: false,
        maxMembers: 50,
        createdById: moderator.id
      }
    })
  ]);

  for (const cirvia of cirvias) {
    await prisma.cirviaChat.create({ data: { cirviaId: cirvia.id } });
  }

  const membershipMatrix = [
    { cirviaId: cirvias[0].id, userId: owner.id, role: 'OWNER', status: 'ACTIVE' },
    { cirviaId: cirvias[0].id, userId: admin.id, role: 'ADMIN', status: 'ACTIVE' },
    { cirviaId: cirvias[0].id, userId: moderator.id, role: 'MODERATOR', status: 'ACTIVE' },
    { cirviaId: cirvias[0].id, userId: member.id, role: 'MEMBER', status: 'ACTIVE' },
    { cirviaId: cirvias[1].id, userId: admin.id, role: 'OWNER', status: 'ACTIVE' },
    { cirviaId: cirvias[1].id, userId: owner.id, role: 'ADMIN', status: 'ACTIVE' },
    { cirviaId: cirvias[1].id, userId: guest.id, role: 'MEMBER', status: 'PENDING' },
    { cirviaId: cirvias[2].id, userId: moderator.id, role: 'OWNER', status: 'ACTIVE' },
    { cirviaId: cirvias[2].id, userId: member.id, role: 'MEMBER', status: 'MUTED' },
    { cirviaId: cirvias[2].id, userId: guest.id, role: 'MEMBER', status: 'ACTIVE' }
  ] as const;

  for (const membership of membershipMatrix) {
    await prisma.cirviaMember.create({
      data: {
        ...membership,
        mutedUntil:
          membership.status === 'MUTED' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
      }
    });

    await prisma.identityScope.createMany({
      data: [
        { userId: membership.userId, cirviaId: membership.cirviaId, scope: 'cirvia:read' },
        { userId: membership.userId, cirviaId: membership.cirviaId, scope: 'cirvia:chat' }
      ],
      skipDuplicates: true
    });
  }

  for (const cirvia of cirvias) {
    await prisma.cirviaInvite.create({
      data: {
        cirviaId: cirvia.id,
        inviteCode: await createUniqueInviteCode(),
        createdById: cirvia.createdById,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxUses: 100,
        isActive: true
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
