import { ChatList } from '@/components/chat-list';

export default function ChatsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Chats</h1>
      <ChatList />
    </div>
  );
}
