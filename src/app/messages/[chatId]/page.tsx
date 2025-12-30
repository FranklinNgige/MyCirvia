import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  listMessagesForChat,
  reportMessage,
  sendMessageToChat,
} from "@/app/actions/messages";
import { MessageThread } from "@/components/messages/MessageThread";
import { MessageComposer } from "@/components/messages/MessageComposer";

const ChatPage = async ({ params }: { params: { chatId: string } }) => {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-6 text-sm">Please sign in to view this chat.</p>;
  }

  const { messages, nextCursor } = await listMessagesForChat(params.chatId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Direct chat</h1>
        <p className="text-xs text-neutral-500">
          Message requests become active after acceptance.
        </p>
      </header>
      <MessageThread
        initialMessages={messages}
        initialCursor={nextCursor}
        scope="chat"
        scopeId={params.chatId}
        currentUserId={user.id}
        onReportMessage={reportMessage}
      />
      <MessageComposer
        action={sendMessageToChat}
        hiddenFields={[{ name: "chatId", value: params.chatId }]}
      />
    </div>
  );
};

export default ChatPage;
