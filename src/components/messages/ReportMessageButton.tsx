"use client";

import { useState, useTransition } from "react";

export const ReportMessageButton = ({
  action,
  messageId,
}: {
  action: (formData: FormData) => Promise<void>;
  messageId: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [context, setContext] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="text-xs text-red-600"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? "Cancel" : "Report"}
      </button>
      {isOpen && (
        <form
          action={(formData) => {
            startTransition(async () => {
              try {
                await action(formData);
                setIsOpen(false);
                setReason("");
                setContext("");
              } catch (error) {
                console.error(error);
              }
            });
          }}
          className="flex flex-col gap-2 rounded border p-3"
        >
          <input type="hidden" name="messageId" value={messageId} />
          <input
            name="reason"
            className="rounded border px-2 py-1 text-xs"
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
          <textarea
            name="context"
            rows={2}
            className="rounded border px-2 py-1 text-xs"
            placeholder="Additional context (optional)"
            value={context}
            onChange={(event) => setContext(event.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
            disabled={isPending}
          >
            {isPending ? "Reporting..." : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
};
