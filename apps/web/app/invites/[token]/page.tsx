import { acceptInvite } from "../../../src/actions/cirvias";

interface InvitePageProps {
  params: { token: string };
}

export default function InvitePage({ params }: InvitePageProps) {
  return (
    <main>
      <h1>Accept Invite</h1>
      <p>This invite will create a pending request unless auto-approve is enabled.</p>
      <form action={acceptInvite.bind(null, params.token)}>
        <button type="submit">Accept Invite</button>
      </form>
    </main>
  );
}
