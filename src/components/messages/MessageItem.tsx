import { MessageRow } from "@/lib/types/messages";

export const MessageItem = ({
  message,
  isOwnMessage,
}: {
  message: MessageRow;
  isOwnMessage: boolean;
}) => {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-3 text-sm ${
        isOwnMessage ? "bg-neutral-50" : "bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="font-semibold text-neutral-700">
          {message.displayName}
        </span>
        <span>•</span>
        <span>{new Date(message.createdAt).toLocaleString()}</span>
        {message.isSystem && (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px]">
            System
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-neutral-900">
        {message.content}
      </p>
    </div>
  );
};
