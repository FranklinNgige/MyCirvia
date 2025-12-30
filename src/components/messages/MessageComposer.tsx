"use client";

import { useState, useTransition } from "react";

export const MessageComposer = ({
  action,
  hiddenFields,
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Array<{ name: string; value: string }>;
}) => {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await action(formData);
            setContent("");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Unable to send message."
            );
          }
        });
      }}
    >
      {hiddenFields.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}
      <textarea
        name="content"
        rows={3}
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Write a message..."
        value={content}
        onChange={(event) => setContent(event.target.value)}
        required
      />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{error}</span>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-white"
          disabled={isPending}
        >
          {isPending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
};
