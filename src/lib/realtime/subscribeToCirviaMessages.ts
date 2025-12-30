import { SupabaseClient } from "@supabase/supabase-js";
import { MessageRow } from "@/lib/types/messages";

export const subscribeToCirviaMessages = (
  supabase: SupabaseClient,
  cirviaId: string,
  onInsert: (message: MessageRow) => void
) => {
  const channel = supabase
    .channel(`cirvia:${cirviaId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `cirvia_id=eq.${cirviaId}`,
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
