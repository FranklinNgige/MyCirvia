'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { forgotPassword } from '@/lib/api/auth';

const schema = z.object({ email: z.string().email() });

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => forgotPassword(values.email),
    onSettled: () => setSubmitted(true)
  });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Forgot password</h1>
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <input className="w-full rounded-md border p-2" placeholder="Email" {...register('email')} />
        {formState.errors.email && <p className="text-sm text-rose-600">{formState.errors.email.message}</p>}
        <button className="w-full rounded-md bg-indigo-600 p-2 text-white" disabled={mutation.isPending}>
          Send reset link
        </button>
      </form>
      {submitted && (
        <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
          If that email exists, we sent a reset link.
        </p>
      )}
    </main>
  );
}
