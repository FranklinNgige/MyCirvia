'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { loginUser } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth-store';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setSession(data);
      toast.success('Welcome back!');
      router.push('/cirvias');
    },
    onError: () => toast.error('Invalid credentials')
  });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Login</h1>
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <input className="w-full rounded-md border p-2" placeholder="Email" {...register('email')} />
        <input type="password" className="w-full rounded-md border p-2" placeholder="Password" {...register('password')} />
        {Object.values(formState.errors).map((error) => (
          <p key={error.message} className="text-sm text-rose-600">
            {error.message}
          </p>
        ))}
        <button className="w-full rounded-md bg-indigo-600 p-2 text-white" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <Link className="mt-4 inline-block text-sm text-indigo-700" href="/auth/forgot-password">
        Forgot password?
      </Link>
    </main>
  );
}
