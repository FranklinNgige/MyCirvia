import { PrismaClient } from '@prisma/client';
const Database = require('better-sqlite3');
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'test-chat-messaging.sqlite');

const migrationFiles = [
  'prisma/migrations/20260214170000_cirvia_schema/migration.sql',
  'prisma/migrations/20260215120000_cirvia_member_removed_and_global_identity/migration.sql',
  'prisma/migrations/20260216100000_identity_scope_visibility_columns/migration.sql',
  'prisma/migrations/20260217153000_chat_messaging_schema/migration.sql'
] as const;

describe('Chat messaging Prisma schema', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = `file:${dbPath}`;

    if (existsSync(dbPath)) unlinkSync(dbPath);

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    for (const migrationFile of migrationFiles) {
      db.exec(readFileSync(join(process.cwd(), migrationFile), 'utf8'));
    }

    db.exec(`
      INSERT INTO "User" ("id", "email") VALUES
      ('user-1', 'user-1@test.local'),
      ('user-2', 'user-2@test.local'),
      ('user-3', 'user-3@test.local');

      INSERT INTO "Cirvia" (
        "id", "name", "description", "visibility", "requireApproval", "createdById", "createdAt", "updatedAt"
      ) VALUES (
        'cirvia-1', 'Messaging Cirvia', 'test cirvia', 'PRIVATE', 0, 'user-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      );
    `);

    db.close();

    prisma = new PrismaClient({ datasourceUrl: `file:${dbPath}` });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  it('creates one-to-one and cirvia group chats', async () => {
    const oneToOneChat = await prisma.chat.create({
      data: {
        chatType: 'ONE_TO_ONE',
        participants: {
          create: [{ userId: 'user-1' }, { userId: 'user-2' }]
        }
      },
      include: { participants: true }
    });

    expect(oneToOneChat.participants).toHaveLength(2);

    const groupChat = await prisma.chat.create({
      data: {
        chatType: 'CIRVIA_GROUP',
        cirviaId: 'cirvia-1'
      }
    });

    expect(groupChat.cirviaId).toBe('cirvia-1');
    expect(groupChat.chatType).toBe('CIRVIA_GROUP');
  });

  it('creates messages and can fetch by chat timeline', async () => {
    const chat = await prisma.chat.create({
      data: {
        chatType: 'ONE_TO_ONE',
        participants: {
          create: [{ userId: 'user-1' }, { userId: 'user-3' }]
        }
      }
    });

    await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: 'user-1',
        contentText: 'first',
        mediaKeys: JSON.stringify([])
      }
    });

    await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: 'user-3',
        contentText: 'second',
        mediaKeys: JSON.stringify(['uploads/second.png'])
      }
    });

    const timeline = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });

    expect(timeline.map((message) => message.contentText)).toEqual(['first', 'second']);
  });

  it('enforces participant uniqueness and lastReadAt updates', async () => {
    const chat = await prisma.chat.create({
      data: {
        chatType: 'ONE_TO_ONE',
        participants: {
          create: [{ userId: 'user-2' }, { userId: 'user-3' }]
        }
      },
      include: { participants: true }
    });

    await expect(
      prisma.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId: 'user-2'
        }
      })
    ).rejects.toThrow();

    const updated = await prisma.chatParticipant.update({
      where: {
        chatId_userId: {
          chatId: chat.id,
          userId: 'user-2'
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });

    expect(updated.lastReadAt).toBeTruthy();
  });
});
