'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { resetPassword } from '@/lib/api/auth';

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => resetPassword(token, values.password),
    onSuccess: () => {
      toast.success('Password reset successfully');
      router.push('/auth/login');
    },
    onError: () => toast.error('Reset failed')
  });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Reset password</h1>
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <input type="password" className="w-full rounded-md border p-2" placeholder="New password" {...register('password')} />
        <input
          type="password"
          className="w-full rounded-md border p-2"
          placeholder="Confirm new password"
          {...register('confirmPassword')}
        />
        {Object.values(formState.errors).map((error) => (
          <p key={error.message} className="text-sm text-rose-600">
            {error.message}
          </p>
        ))}
        <button className="w-full rounded-md bg-indigo-600 p-2 text-white" disabled={mutation.isPending || !token}>
          Reset password
        </button>
      </form>
    </main>
  );
}
