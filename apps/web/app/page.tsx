import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Welcome to MyCirvia</h1>
      <p className="text-slate-600">Build identity-resolved circles with privacy-first participation.</p>
      <div className="flex justify-center gap-3">
        <Link href="/auth/login" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Login
        </Link>
        <Link href="/auth/register" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
          Register
        </Link>
      </div>
    </main>
  );
}
