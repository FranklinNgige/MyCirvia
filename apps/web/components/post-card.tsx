'use client';

import Link from 'next/link';
import { IdentityDisplay } from '@/components/identity-display';
import type { FeedPostContext } from '@/lib/types';
import { formatRelativeTime } from '@/lib/time';

interface PostCardProps {
  item: FeedPostContext;
  onLikeToggle: (postId: string, shouldLike: boolean) => void;
}

export function PostCard({ item, onLikeToggle }: PostCardProps) {
  return (
    <article className="space-y-4 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <IdentityDisplay identity={item.author} />
        <time className="text-xs text-slate-500" dateTime={item.post.createdAt}>
          {formatRelativeTime(item.post.createdAt)}
        </time>
      </div>

      <p className="whitespace-pre-wrap text-sm text-slate-800">{item.post.contentText}</p>

      {item.post.mediaKeys.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {item.post.mediaKeys.map((mediaKey) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={mediaKey}
              src={mediaKey}
              alt="Post media"
              className="h-40 w-full rounded-md border object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          aria-label={item.likedByCurrentUser ? 'Unlike post' : 'Like post'}
          onClick={() => onLikeToggle(item.post.id, !item.likedByCurrentUser)}
          className={`rounded-md px-3 py-1 ${item.likedByCurrentUser ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-700'}`}
        >
          ♥ {item.likeCount}
        </button>

        <Link
          href={`/posts/${item.post.id}`}
          aria-label="Open comments"
          className="rounded-md bg-slate-100 px-3 py-1 text-slate-700"
        >
          💬 {item.commentCount}
        </Link>
      </div>
    </article>
  );
}
