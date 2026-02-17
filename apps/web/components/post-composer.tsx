'use client';

import { useState } from 'react';

export function PostComposer({ onSubmit, isSubmitting }: { onSubmit: (contentText: string) => Promise<void>; isSubmitting: boolean }) {
  const [contentText, setContentText] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = contentText.trim();
    if (!value || isSubmitting) return;
    await onSubmit(value);
    setContentText('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-white p-4">
      <label htmlFor="new-post" className="sr-only">
        New post content
      </label>
      <textarea
        id="new-post"
        aria-label="Write a new post"
        value={contentText}
        onChange={(e) => setContentText(e.target.value)}
        placeholder="Share something with your cirvia..."
        className="min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm outline-none ring-indigo-200 focus:ring"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Upload image (coming soon)"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
        >
          Add image (soon)
        </button>
        <button
          type="submit"
          aria-label="Submit post"
          disabled={!contentText.trim() || isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
