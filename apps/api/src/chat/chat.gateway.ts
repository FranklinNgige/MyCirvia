import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { UseFilters } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { safeLog } from '../logging/logger';
import { ChatService } from './chat.service';
import { ChatRedisService } from './chat.redis.service';
import { ChatWsAuthService } from './chat-ws-auth.service';
import { JoinChatDto, LeaveChatDto, MessageReadDto, SendMessageDto, TypingIndicatorDto } from './dto/chat.dto';

@WebSocketGateway({ cors: { origin: '*' } })
@UseFilters()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly authService: ChatWsAuthService,
    private readonly chatService: ChatService,
    private readonly redis: ChatRedisService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const user = this.authService.validateSocketUser(client as any);
    client.data.userId = user.userId;
    await this.redis.setUserSocket(user.userId, client.id);
    safeLog('info', 'socket.connect', { userId: user.userId, socketId: client.id });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    if (client.data.userId) {
      await this.redis.removeUserSocket(client.data.userId as string);
      safeLog('info', 'socket.disconnect', { userId: client.data.userId, socketId: client.id });
    }
  }

  @SubscribeMessage('join-chat')
  async joinChat(@ConnectedSocket() client: Socket, @MessageBody() dto: JoinChatDto) {
    await this.chatService.assertChatAccess(dto.chatId, client.data.userId);
    await client.join(`chat:${dto.chatId}`);
    safeLog('info', 'socket.join-chat', { userId: client.data.userId, chatId: dto.chatId });
    client.emit('joined-chat', { chatId: dto.chatId });
  }

  @SubscribeMessage('leave-chat')
  async leaveChat(@ConnectedSocket() client: Socket, @MessageBody() dto: LeaveChatDto) {
    await client.leave(`chat:${dto.chatId}`);
    safeLog('info', 'socket.leave-chat', { userId: client.data.userId, chatId: dto.chatId });
  }

  @SubscribeMessage('send-message')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() dto: SendMessageDto) {
    const payload = await this.chatService.sendMessage(dto, client.data.userId);
    this.server.to(`chat:${dto.chatId}`).emit('new-message', payload);
    safeLog('info', 'socket.push-placeholder', { chatId: dto.chatId, messageId: payload.message.id });
    return payload;
  }

  @SubscribeMessage('typing-indicator')
  async typing(@ConnectedSocket() client: Socket, @MessageBody() dto: TypingIndicatorDto) {
    await this.chatService.assertChatAccess(dto.chatId, client.data.userId);
    client.to(`chat:${dto.chatId}`).emit('user-typing', { userId: client.data.userId, isTyping: dto.isTyping });
  }

  @SubscribeMessage('message-read')
  async messageRead(@ConnectedSocket() client: Socket, @MessageBody() dto: MessageReadDto) {
    const receipt = await this.chatService.markMessageRead(dto.messageId, client.data.userId);
    const senderSocket = await this.redis.getUserSocket(receipt.senderId);
    if (senderSocket) {
      this.server.to(senderSocket).emit('message-read', { messageId: receipt.messageId, readBy: receipt.readBy });
    }
    return { messageId: receipt.messageId, readBy: receipt.readBy };
  }

  emitMessageDeleted(chatId: string, messageId: string) {
    this.server.to(`chat:${chatId}`).emit('message-deleted', { messageId });
  }
}
