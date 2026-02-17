'use client';

import { useId, useState } from 'react';

export function CommentComposer({
  onSubmit,
  placeholder = 'Write a comment...',
  isSubmitting
}: {
  onSubmit: (contentText: string) => Promise<void>;
  placeholder?: string;
  isSubmitting: boolean;
}) {
  const [content, setContent] = useState('');
  const inputId = useId();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed);
    setContent('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor={inputId} className="sr-only">
        Comment content
      </label>
      <input
        id={inputId}
        aria-label="Comment input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        aria-label="Submit comment"
        disabled={!content.trim() || isSubmitting}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:bg-indigo-300"
      >
        Reply
      </button>
    </form>
  );
}
