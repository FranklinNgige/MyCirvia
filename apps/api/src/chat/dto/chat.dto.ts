export class JoinChatDto {
  chatId!: string;
}

export class LeaveChatDto {
  chatId!: string;
}

export class SendMessageDto {
  chatId!: string;
  contentText!: string;
  mediaKeys?: string[];
}

export class TypingIndicatorDto {
  chatId!: string;
  isTyping!: boolean;
}

export class MessageReadDto {
  messageId!: string;
}

export class ChatMessagesQueryDto {
  limit?: number;
  cursor?: string;
  before?: boolean;
}

export class CreateOneToOneChatDto {
  otherUserId!: string;
}
