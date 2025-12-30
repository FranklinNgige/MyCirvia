import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listChatsForUser } from "@/app/actions/messages";
import { ChatList } from "@/components/messages/ChatList";

const MessagesPage = async () => {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-6 text-sm">Please sign in to view messages.</p>;
  }

  const chats = await listChatsForUser();

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Messages</h1>
          <p className="text-sm text-neutral-500">
            Direct chats and Cirvia group rooms.
          </p>
        </div>
        <Link
          href="/app/cirvias"
          className="rounded border px-3 py-2 text-sm"
        >
          Go to Cirvias
        </Link>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase text-neutral-500">
          Direct chats
        </h2>
        <ChatList chats={chats} currentUserId={user.id} />
      </section>
      <section className="flex flex-col gap-2 rounded border p-4">
        <h2 className="text-sm font-semibold">Start a new chat</h2>
        <p className="text-xs text-neutral-500">
          New chats begin as message requests. The recipient must accept before
          the thread becomes active.
        </p>
        <form
          action={async (formData) => {
            "use server";
            const participantId = formData.get("participantId")?.toString();
            if (!participantId) {
              return;
            }
            const { getOrCreateChat } = await import("@/app/actions/messages");
            const chatId = await getOrCreateChat(participantId);
            redirect(`/app/messages/${chatId}`);
          }}
          className="flex gap-2"
        >
          <input
            name="participantId"
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="Recipient user id"
            required
          />
          <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
            Request
          </button>
        </form>
      </section>
    </div>
  );
};

export default MessagesPage;
