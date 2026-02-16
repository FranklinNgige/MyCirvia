'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { registerUser } from '@/lib/api/auth';

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    ageRange: z.enum(['13-17', '18-24', '25-34', '35-44', '45+']),
    gender: z.enum(['female', 'male', 'non_binary', 'prefer_not_to_say'])
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      registerUser({
        email: values.email,
        password: values.password,
        ageRange: values.ageRange,
        gender: values.gender
      }),
    onSuccess: () => toast.success('Check your email to verify'),
    onError: () => toast.error('Unable to register')
  });

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Register</h1>
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <input className="w-full rounded-md border p-2" placeholder="Email" {...register('email')} />
        <input type="password" className="w-full rounded-md border p-2" placeholder="Password" {...register('password')} />
        <input
          type="password"
          className="w-full rounded-md border p-2"
          placeholder="Confirm Password"
          {...register('confirmPassword')}
        />
        <select className="w-full rounded-md border p-2" {...register('ageRange')}>
          <option value="">Age Range</option>
          <option value="13-17">13-17</option>
          <option value="18-24">18-24</option>
          <option value="25-34">25-34</option>
          <option value="35-44">35-44</option>
          <option value="45+">45+</option>
        </select>
        <select className="w-full rounded-md border p-2" {...register('gender')}>
          <option value="">Gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="non_binary">Non-binary</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
        {Object.values(formState.errors).map((error) => (
          <p key={error.message} className="text-sm text-rose-600">
            {error.message}
          </p>
        ))}
        <button className="w-full rounded-md bg-indigo-600 p-2 text-white" disabled={mutation.isPending}>
          {mutation.isPending ? 'Submitting...' : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-600">Check your email to verify after registration.</p>
      </form>
    </main>
  );
}
