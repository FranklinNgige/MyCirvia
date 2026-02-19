import { Controller, Delete, Get, Param, Post, Query, Body } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatMessagesQueryDto, CreateOneToOneChatDto } from './dto/chat.dto';
import { ChatGateway } from './chat.gateway';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService, private readonly chatGateway: ChatGateway) {}

  @Get('/chats/my')
  listMyChats(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.getMyChats(user.userId);
  }

  @Get('/chats/:chatId/messages')
  listMessages(@Param('chatId') chatId: string, @Query() query: ChatMessagesQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.chatService.getChatMessages(chatId, query, user.userId);
  }

  @Post('/chats')
  createOneToOne(@Body() dto: CreateOneToOneChatDto, @CurrentUser() user: CurrentUserPayload) {
    return this.chatService.createOneToOneChat(dto, user.userId);
  }

  @Delete('/messages/:messageId')
  async deleteMessage(@Param('messageId') messageId: string, @CurrentUser() user: CurrentUserPayload) {
    const deleted = await this.chatService.deleteMessage(messageId, user.userId);
    this.chatGateway.emitMessageDeleted(deleted.chatId, deleted.messageId);
    return { success: true };
  }
}
