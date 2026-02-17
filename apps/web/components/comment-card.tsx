'use client';

import { useState } from 'react';
import { IdentityDisplay } from '@/components/identity-display';
import { CommentComposer } from '@/components/comment-composer';
import { formatRelativeTime } from '@/lib/time';
import type { CommentNode } from '@/lib/types';

interface CommentCardProps {
  comment: CommentNode;
  onLikeToggle: (commentId: string, shouldLike: boolean) => void;
  onReply: (parentCommentId: string, contentText: string) => Promise<void>;
}

export function CommentCard({ comment, onLikeToggle, onReply }: CommentCardProps) {
  const [showReply, setShowReply] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <IdentityDisplay identity={comment.author} />
        <time dateTime={comment.createdAt} className="text-xs text-slate-500">
          {formatRelativeTime(comment.createdAt)}
        </time>
      </div>

      <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.contentText}</p>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          aria-label={comment.likedByCurrentUser ? 'Unlike comment' : 'Like comment'}
          onClick={() => onLikeToggle(comment.id, !comment.likedByCurrentUser)}
          className="rounded-md bg-slate-100 px-2 py-1"
        >
          ♥ {comment.likeCount}
        </button>
        <button
          type="button"
          aria-label="Reply to comment"
          className="rounded-md bg-slate-100 px-2 py-1"
          onClick={() => setShowReply((prev) => !prev)}
        >
          Reply
        </button>
      </div>

      {showReply ? <CommentComposer onSubmit={(text) => onReply(comment.id, text)} isSubmitting={false} placeholder="Write a reply..." /> : null}

      {comment.replies.length > 0 ? (
        <div className="space-y-3 border-l border-slate-200 pl-4">
          {comment.replies.map((reply) => (
            <CommentCard key={reply.id} comment={reply} onLikeToggle={onLikeToggle} onReply={onReply} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
