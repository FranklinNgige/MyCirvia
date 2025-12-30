import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  listCirviaMessages,
  reportMessage,
  sendMessageToCirvia,
} from "@/app/actions/messages";
import { MessageThread } from "@/components/messages/MessageThread";
import { MessageComposer } from "@/components/messages/MessageComposer";

const CirviaChatPage = async ({ params }: { params: { id: string } }) => {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-6 text-sm">Please sign in to view this Cirvia chat.</p>;
  }

  const { messages, nextCursor } = await listCirviaMessages(params.id);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Cirvia group chat</h1>
        <p className="text-xs text-neutral-500">
          Only active Cirvia members can view or send messages.
        </p>
      </header>
      <MessageThread
        initialMessages={messages}
        initialCursor={nextCursor}
        scope="cirvia"
        scopeId={params.id}
        currentUserId={user.id}
        onReportMessage={reportMessage}
      />
      <MessageComposer
        action={sendMessageToCirvia}
        hiddenFields={[{ name: "cirviaId", value: params.id }]}
      />
    </div>
  );
};

export default CirviaChatPage;
