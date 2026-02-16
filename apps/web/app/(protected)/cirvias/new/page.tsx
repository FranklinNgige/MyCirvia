'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { createCirvia } from '@/lib/api/cirvias';

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  visibility: z.enum(['public', 'private']),
  requireApproval: z.boolean(),
  maxMembers: z.coerce.number().min(2).optional()
});

type FormValues = z.infer<typeof schema>;

export default function NewCirviaPage() {
  const router = useRouter();
  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: 'private', requireApproval: true }
  });

  const mutation = useMutation({
    mutationFn: createCirvia,
    onSuccess: ({ id }) => {
      toast.success('Cirvia created');
      router.push(`/cirvias/${id}`);
    },
    onError: () => toast.error('Could not create cirvia')
  });

  return (
    <section className="mx-auto max-w-xl rounded-xl border bg-white p-6">
      <h1 className="mb-6 text-2xl font-semibold">Create Cirvia</h1>
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <input className="w-full rounded-md border p-2" placeholder="Name" {...register('name')} />
        <textarea className="w-full rounded-md border p-2" placeholder="Description" rows={4} {...register('description')} />
        <select className="w-full rounded-md border p-2" {...register('visibility')}>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('requireApproval')} /> Require approval
        </label>
        <input type="number" className="w-full rounded-md border p-2" placeholder="Max members" {...register('maxMembers')} />
        <button className="w-full rounded-md bg-indigo-600 p-2 text-white" disabled={mutation.isPending}>
          Create
        </button>
      </form>
    </section>
  );
}
