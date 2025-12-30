import {
  approveJoinRequest,
  banMember,
  changeMemberRole,
  denyJoinRequest,
  listPendingMembers,
  removeMember,
} from "../../../../src/actions/cirvias";
import { createSupabaseServerClient } from "../../../../src/lib/supabase/server";
import type { CirviaRole } from "../../../../src/types/cirvia";

interface MembersPageProps {
  params: { id: string };
}

export default async function MembersPage({ params }: MembersPageProps) {
  const supabase = createSupabaseServerClient();
  const { data: members } = await supabase
    .from("cirvia_members")
    .select("id, user_id, role, status")
    .eq("cirvia_id", params.id);

  const pending = await listPendingMembers(params.id);

  return (
    <main>
      <h1>Members</h1>

      <section>
        <h2>Pending Requests</h2>
        {pending.length === 0 ? (
          <p>No pending requests.</p>
        ) : (
          <ul>
            {pending.map((member) => (
              <li key={member.id}>
                <p>User: {member.user_id}</p>
                <form action={approveJoinRequest.bind(null, member.id)}>
                  <button type="submit">Approve</button>
                </form>
                <form action={denyJoinRequest.bind(null, member.id)}>
                  <button type="submit">Deny</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Active Members</h2>
        {members?.length ? (
          <ul>
            {members.map((member) => (
              <li key={member.id}>
                <p>
                  {member.user_id} — {member.role} ({member.status})
                </p>
                <form
                  action={async (formData) => {
                    "use server";
                    const role = String(formData.get("role") ?? "member");
                    await changeMemberRole(member.id, role as CirviaRole);
                  }}
                >
                  <select name="role" defaultValue={member.role}>
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit">Update Role</button>
                </form>
                <form action={removeMember.bind(null, member.id)}>
                  <button type="submit">Remove</button>
                </form>
                <form action={banMember.bind(null, member.id)}>
                  <button type="submit">Ban</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p>No members found.</p>
        )}
      </section>
    </main>
  );
}
