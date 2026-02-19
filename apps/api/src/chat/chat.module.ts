import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRedisService } from './chat.redis.service';
import { ChatService } from './chat.service';
import { ChatWsAuthService } from './chat-ws-auth.service';

@Module({
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ChatRedisService, ChatWsAuthService, PrismaService],
  exports: [ChatGateway],
})
export class ChatModule {}
