import Link from "next/link";

import { createSupabaseServerClient } from "../../../src/lib/supabase/server";
import { requestToJoin, createInviteLink, updateCirviaSettings } from "../../../src/actions/cirvias";

interface CirviaPageProps {
  params: { id: string };
}

export default async function CirviaPage({ params }: CirviaPageProps) {
  const supabase = createSupabaseServerClient();
  const { data: cirvia } = await supabase
    .from("cirvias")
    .select("id, name, description, visibility, invite_only, auto_approve")
    .eq("id", params.id)
    .single();

  if (!cirvia) {
    return (
      <main>
        <p>Cirvia not found.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{cirvia.name}</h1>
      <p>{cirvia.description ?? "No description"}</p>
      <p>Visibility: {cirvia.visibility}</p>
      <p>Invite-only: {cirvia.invite_only ? "Yes" : "No"}</p>
      <p>Auto-approve: {cirvia.auto_approve ? "Yes" : "No"}</p>

      <section>
        <h2>Membership</h2>
        <form action={requestToJoin.bind(null, cirvia.id)}>
          <button type="submit">Request to Join</button>
        </form>
        <p>
          <Link href={`/cirvias/${cirvia.id}/members`}>Manage Members</Link>
        </p>
      </section>

      <section>
        <h2>Invite Link</h2>
        <form action={async () => {
          "use server";
          await createInviteLink(cirvia.id);
        }}>
          <button type="submit">Create Invite</button>
        </form>
      </section>

      <section>
        <h2>Settings</h2>
        <form action={updateCirviaSettings.bind(null, cirvia.id)}>
          <label>
            Name
            <input name="name" defaultValue={cirvia.name} required />
          </label>
          <label>
            Description
            <textarea name="description" defaultValue={cirvia.description ?? ""} />
          </label>
          <label>
            Visibility
            <select name="visibility" defaultValue={cirvia.visibility}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label>
            <input type="checkbox" name="invite_only" defaultChecked={cirvia.invite_only} />
            Invite-only
          </label>
          <label>
            <input type="checkbox" name="auto_approve" defaultChecked={cirvia.auto_approve} />
            Auto-approve invites
          </label>
          <button type="submit">Save Settings</button>
        </form>
      </section>
    </main>
  );
}
