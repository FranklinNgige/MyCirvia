import { ForbiddenException } from '@nestjs/common';
import { ChatService } from '../src/chat/chat.service';

describe('ChatService security', () => {
  function createService({ limited = false, participant = true } = {}) {
    const db = {
      get: jest.fn((sql: string) => {
        if (sql.includes('FROM "ChatParticipant"')) return participant ? { id: 'cp1' } : undefined;
        if (sql.includes('FROM "Chat" WHERE id =')) return { id: 'c1', type: 'ONE_TO_ONE', cirviaId: null };
        if (sql.includes('FROM "Message" WHERE id =')) return { id: 'm1', chatId: 'c1', senderId: 'u2' };
        return undefined;
      }),
      all: jest.fn(() => []),
      run: jest.fn(),
      transaction: (fn: any) => fn(),
    } as any;

    const redis = {
      hitRateLimit: jest.fn().mockResolvedValue(limited),
    } as any;

    return { service: new ChatService(db, redis), db, redis };
  }

  it('rate limiting triggers on send-message', async () => {
    const { service } = createService({ limited: true });
    await expect(service.sendMessage({ chatId: 'c1', contentText: 'hello' }, 'u1')).rejects.toThrow('Rate limit exceeded');
  });

  it('authorization blocks chat access', async () => {
    const { service } = createService({ participant: false });
    await expect(service.assertChatAccess('c1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('creates read receipt only once', async () => {
    const { service, db } = createService();
    db.get.mockImplementation((sql: string) => {
      if (sql.includes('FROM "Message" WHERE id =')) return { id: 'm1', chatId: 'c1', senderId: 'u2' };
      if (sql.includes('FROM "ChatParticipant"')) return { id: 'cp1' };
      if (sql.includes('FROM "MessageReadReceipt"')) return undefined;
      return undefined;
    });

    const receipt = await service.markMessageRead('m1', 'u1');
    expect(receipt.readBy).toBe('u1');
    expect(db.run).toHaveBeenCalled();
  });
});
