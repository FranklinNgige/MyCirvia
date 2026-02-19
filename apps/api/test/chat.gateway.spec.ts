import { ForbiddenException } from '@nestjs/common';
import { ChatGateway } from '../src/chat/chat.gateway';
import { ChatWsAuthService } from '../src/chat/chat-ws-auth.service';

describe('ChatGateway', () => {
  const auth = new ChatWsAuthService();

  it('authenticates socket from query token', () => {
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ sub: 'u-1', email: 'u@test.com', role: 'user' }, 'access-secret');
    const payload = auth.validateSocketUser({ handshake: { query: { token } } });
    expect(payload.userId).toBe('u-1');
  });

  it('rejects invalid socket token', () => {
    expect(() => auth.validateSocketUser({ handshake: { query: { token: 'bad' } } })).toThrow('Invalid socket token');
  });

  it('join/leave and send message events operate correctly', async () => {
    const chatService = {
      assertChatAccess: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue({ message: { id: 'm1' }, sender: { userId: 'u1' } }),
      markMessageRead: jest.fn().mockResolvedValue({ messageId: 'm1', readBy: 'u2', senderId: 'u1' }),
    } as any;
    const redis = { setUserSocket: jest.fn(), removeUserSocket: jest.fn(), getUserSocket: jest.fn().mockResolvedValue('sock-1') } as any;
    const gateway = new ChatGateway({ validateSocketUser: () => ({ userId: 'u1' }) } as any, chatService, redis);
    const roomEmit = jest.fn();
    const directEmit = jest.fn();
    gateway.server = { to: jest.fn().mockImplementation((room: string) => ({ emit: room === 'sock-1' ? directEmit : roomEmit })) } as any;

    const client = {
      id: 'sock-client',
      data: { userId: 'u1' },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as any;

    await gateway.joinChat(client, { chatId: 'c1' });
    expect(client.join).toHaveBeenCalledWith('chat:c1');
    expect(client.emit).toHaveBeenCalledWith('joined-chat', { chatId: 'c1' });

    await gateway.leaveChat(client, { chatId: 'c1' });
    expect(client.leave).toHaveBeenCalledWith('chat:c1');

    await gateway.sendMessage(client, { chatId: 'c1', contentText: 'hello' });
    expect(roomEmit).toHaveBeenCalledWith('new-message', { message: { id: 'm1' }, sender: { userId: 'u1' } });
  });

  it('authorization failure on join is propagated', async () => {
    const gateway = new ChatGateway({ validateSocketUser: () => ({ userId: 'u1' }) } as any, {
      assertChatAccess: jest.fn().mockRejectedValue(new ForbiddenException('nope')),
    } as any, {} as any);
    const client = { data: { userId: 'u1' } } as any;
    await expect(gateway.joinChat(client, { chatId: 'c1' })).rejects.toThrow(ForbiddenException);
  });
});
