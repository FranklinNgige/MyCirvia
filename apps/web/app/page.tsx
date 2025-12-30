import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>MyCirvia</h1>
      <p>Welcome to the Cirvia system MVP.</p>
      <ul>
        <li>
          <Link href="/cirvias">My Cirvias</Link>
        </li>
        <li>
          <Link href="/cirvias/discover">Discover Cirvias</Link>
        </li>
        <li>
          <Link href="/cirvias/new">Create a Cirvia</Link>
        </li>
      </ul>
    </main>
  );
}
