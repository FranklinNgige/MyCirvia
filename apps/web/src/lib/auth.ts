import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase/server";

export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  return data.user;
}
