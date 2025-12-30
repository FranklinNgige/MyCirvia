import Link from "next/link";

import { discoverPublicCirvias } from "../../../src/actions/cirvias";

export default async function DiscoverCirviasPage() {
  const cirvias = await discoverPublicCirvias();

  return (
    <main>
      <h1>Discover Cirvias</h1>
      {cirvias.length === 0 ? (
        <p>No public Cirvias yet.</p>
      ) : (
        <ul>
          {cirvias.map((cirvia) => (
            <li key={cirvia.id}>
              <h2>{cirvia.name}</h2>
              <p>{cirvia.description ?? "No description"}</p>
              <Link href={`/cirvias/${cirvia.id}`}>View</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
