import { SupabaseClient } from "@supabase/supabase-js";
import { MessageRow } from "@/lib/types/messages";

export const subscribeToChatMessages = (
  supabase: SupabaseClient,
  chatId: string,
  onInsert: (message: MessageRow) => void
) => {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onInsert(payload.new as MessageRow);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
