import { ChatConversation } from '@/components/chat-conversation';

export default function ChatDetailsPage({ params }: { params: { chatId: string } }) {
  return <ChatConversation chatId={params.chatId} />;
}
