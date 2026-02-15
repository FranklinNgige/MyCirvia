import { Chat, ChatRevealService, IdentityResolverService } from './identity-reveal.js';

export interface RequestLike {
  params: { chatId: string };
  userId: string;
}

export interface ChatRepository {
  getChat(chatId: string): Chat;
}

export class ChatRevealController {
  constructor(
    private readonly chats: ChatRepository,
    private readonly service: ChatRevealService,
    private readonly resolver: IdentityResolverService
  ) {}

  postReveal(req: RequestLike) {
    return this.service.reveal(this.chats.getChat(req.params.chatId), req.userId);
  }

  postRequestMutualReveal(req: RequestLike) {
    return this.service.requestMutualReveal(this.chats.getChat(req.params.chatId), req.userId);
  }

  postAcceptMutualReveal(req: RequestLike) {
    return this.service.acceptMutualReveal(this.chats.getChat(req.params.chatId), req.userId);
  }

  postRevokeReveal(req: RequestLike) {
    return this.service.revokeReveal(this.chats.getChat(req.params.chatId), req.userId);
  }

  getRevealStatus(req: RequestLike) {
    return this.service.getRevealStatus(this.chats.getChat(req.params.chatId), req.userId, this.resolver);
  }
}
