import Link from "next/link";
import { ChatThread } from "@/lib/types/messages";
import { acceptChatRequest } from "@/app/actions/messages";

export const ChatList = ({ chats, currentUserId }: { chats: ChatThread[]; currentUserId: string }) => {
  if (chats.length === 0) {
    return <p className="text-sm text-neutral-500">No chats yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {chats.map((chat) => {
        const otherParticipant =
          chat.participantA === currentUserId ? chat.participantB : chat.participantA;
        return (
          <div key={chat.id} className="rounded border px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <Link href={`/app/messages/${chat.id}`} className="font-semibold">
                Chat with {otherParticipant}
              </Link>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{chat.status}</span>
                {chat.status === "pending" && (
                  <form
                    action={async () => {
                      "use server";
                      await acceptChatRequest(chat.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded border px-2 py-1 text-xs text-neutral-700"
                    >
                      Accept
                    </button>
                  </form>
                )}
              </div>
            </div>
            {chat.lastMessagePreview && (
              <p className="mt-1 text-xs text-neutral-500">{chat.lastMessagePreview}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
