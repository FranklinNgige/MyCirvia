import Link from "next/link";

import { listMyCirvias } from "../../src/actions/cirvias";

export default async function CirviasPage() {
  const cirvias = await listMyCirvias();

  return (
    <main>
      <h1>My Cirvias</h1>
      <p>
        <Link href="/cirvias/new">Create a new Cirvia</Link>
      </p>
      {cirvias.length === 0 ? (
        <p>You are not a member of any Cirvias yet.</p>
      ) : (
        <ul>
          {cirvias.map((member) => (
            <li key={member.cirvia_id}>
              <Link href={`/cirvias/${member.cirvia_id}`}>
                {member.cirvias?.name ?? "Untitled"}
              </Link>
              <p>{member.cirvias?.description ?? "No description"}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
