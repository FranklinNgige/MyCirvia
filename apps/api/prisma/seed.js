const { IdentityLevel, validateIdentityScope } = require('../src/identityScopeValidation');

let prisma;

function buildSeedPlan(userIds, cirviaIds, chatIds) {
  return {
    globalDefaults: [
      { userId: userIds[0], scopeType: 'GLOBAL_DEFAULT', scopeId: 'GLOBAL_DEFAULT', identityLevel: IdentityLevel.ANONYMOUS },
      { userId: userIds[1], scopeType: 'GLOBAL_DEFAULT', scopeId: 'GLOBAL_DEFAULT', identityLevel: IdentityLevel.ANONYMOUS },
    ],
    cirviaScopes: [
      { userId: userIds[0], scopeType: 'CIRVIA', scopeId: cirviaIds[0], identityLevel: IdentityLevel.ANONYMOUS },
      { userId: userIds[0], scopeType: 'CIRVIA', scopeId: cirviaIds[1], identityLevel: IdentityLevel.PARTIAL },
      { userId: userIds[1], scopeType: 'CIRVIA', scopeId: cirviaIds[0], identityLevel: IdentityLevel.PARTIAL },
      { userId: userIds[1], scopeType: 'CIRVIA', scopeId: cirviaIds[1], identityLevel: IdentityLevel.FULL },
    ],
    chatScopes: [
      { userId: userIds[0], scopeType: 'CHAT', scopeId: chatIds[0], identityLevel: IdentityLevel.ANONYMOUS },
      { userId: userIds[1], scopeType: 'CHAT', scopeId: chatIds[1], identityLevel: IdentityLevel.FULL },
    ],
  };
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  const [user1, user2] = await Promise.all([
    prisma.user.create({ data: { email: 'user1@example.com', profile: { create: { chosenName: 'U1' } } } }),
    prisma.user.create({ data: { email: 'user2@example.com', profile: { create: { realName: 'User Two' } } } }),
  ]);

  const [cirvia1, cirvia2] = await Promise.all([
    prisma.cirvia.create({ data: { name: 'Test Cirvia 1' } }),
    prisma.cirvia.create({ data: { name: 'Test Cirvia 2' } }),
  ]);

  await prisma.cirviaMember.createMany({
    data: [
      { userId: user1.id, cirviaId: cirvia1.id },
      { userId: user1.id, cirviaId: cirvia2.id },
      { userId: user2.id, cirviaId: cirvia1.id },
      { userId: user2.id, cirviaId: cirvia2.id },
    ],
  });

  const [chat1, chat2] = await Promise.all([
    prisma.chat.create({ data: { kind: 'DM' } }),
    prisma.chat.create({ data: { kind: 'DM' } }),
  ]);

  await prisma.chatParticipant.createMany({
    data: [
      { chatId: chat1.id, userId: user1.id },
      { chatId: chat1.id, userId: user2.id },
      { chatId: chat2.id, userId: user1.id },
      { chatId: chat2.id, userId: user2.id },
    ],
  });

  const plan = buildSeedPlan([user1.id, user2.id], [cirvia1.id, cirvia2.id], [chat1.id, chat2.id]);
  const profiles = {
    [user1.id]: { chosenName: 'U1' },
    [user2.id]: { realName: 'User Two' },
  };

  for (const scope of [...plan.globalDefaults, ...plan.cirviaScopes, ...plan.chatScopes]) {
    validateIdentityScope(scope, profiles[scope.userId]);
  }

  await prisma.identityScope.createMany({
    data: [...plan.globalDefaults, ...plan.cirviaScopes, ...plan.chatScopes],
  });
}

if (require.main === module) {
  main()
    .then(async () => {
      if (prisma) await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      if (prisma) await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { buildSeedPlan };
