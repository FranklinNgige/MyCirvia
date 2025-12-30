import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IdentityScopeType, IdentitySnapshot } from "@/lib/types/messages";

type IdentitySnapshotResponse = {
  display_name: string;
  display_avatar_url: string | null;
  identity_level: "anonymous" | "partial" | "full";
};

export const getDisplayIdentitySnapshot = async ({
  userId,
  scopeType,
  scopeId,
}: {
  userId: string;
  scopeType: IdentityScopeType;
  scopeId: string;
}): Promise<IdentitySnapshot> => {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_display_identity_snapshot", {
    p_user_id: userId,
    p_scope_type: scopeType,
    p_scope_id: scopeId,
  });

  if (error) {
    throw new Error(`Failed to load identity snapshot: ${error.message}`);
  }

  const snapshot = data as IdentitySnapshotResponse | null;

  if (!snapshot) {
    return {
      displayName: "Anonymous",
      displayAvatarUrl: null,
      identityLevel: "anonymous",
    };
  }

  return {
    displayName: snapshot.display_name,
    displayAvatarUrl: snapshot.display_avatar_url,
    identityLevel: snapshot.identity_level,
  };
};
