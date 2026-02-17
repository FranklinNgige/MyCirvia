'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { PostCard } from '@/components/post-card';
import { PostComposer } from '@/components/post-composer';
import { createPost, getCirviaFeed, likePost, unlikePost } from '@/lib/api/feed';
import type { FeedPage, FeedPostContext } from '@/lib/types';

export default function CirviaFeedPage({ params }: { params: { id: string } }) {
  const cirviaId = params.id;
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);

  const feedQuery = useInfiniteQuery({
    queryKey: ['cirvia-feed', cirviaId],
    queryFn: ({ pageParam }) => getCirviaFeed(cirviaId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 30000
  });

  const createPostMutation = useMutation({
    mutationFn: (contentText: string) => createPost(cirviaId, { contentText }),
    onMutate: async (contentText) => {
      await queryClient.cancelQueries({ queryKey: ['cirvia-feed', cirviaId] });
      const previous = queryClient.getQueryData(['cirvia-feed', cirviaId]);
      const optimisticItem: FeedPostContext = {
        post: {
          id: `optimistic-${Date.now()}`,
          cirviaId,
          authorId: 'current-user',
          contentText,
          mediaKeys: [],
          visibility: 'MEMBERS_ONLY',
          isPinned: false,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null
        },
        author: { displayName: 'You', avatarUrl: null },
        likeCount: 0,
        commentCount: 0,
        likedByCurrentUser: false
      };

      queryClient.setQueryData(['cirvia-feed', cirviaId], (old: { pages: FeedPage[]; pageParams: unknown[] } | undefined) => {
        if (!old) {
          return { pages: [{ items: [optimisticItem], nextCursor: null }], pageParams: [null] };
        }

        const pages = [...old.pages];
        pages[0] = { ...pages[0], items: [optimisticItem, ...pages[0].items] };
        return { ...old, pages };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['cirvia-feed', cirviaId], context.previous);
      }
      toast.error('Could not publish post');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cirvia-feed', cirviaId] });
      toast.success('Post published');
    }
  });

  const likeMutation = useMutation({
    mutationFn: ({ postId, shouldLike }: { postId: string; shouldLike: boolean }) =>
      shouldLike ? likePost(postId) : unlikePost(postId),
    onMutate: async ({ postId, shouldLike }) => {
      await queryClient.cancelQueries({ queryKey: ['cirvia-feed', cirviaId] });
      const previous = queryClient.getQueryData(['cirvia-feed', cirviaId]);

      queryClient.setQueryData(['cirvia-feed', cirviaId], (old: { pages: FeedPage[]; pageParams: unknown[] } | undefined) => {
        if (!old) return old;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => {
            if (item.post.id !== postId) return item;
            const nextCount = Math.max(0, item.likeCount + (shouldLike ? 1 : -1));
            return { ...item, likeCount: nextCount, likedByCurrentUser: shouldLike };
          })
        }));
        return { ...old, pages };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['cirvia-feed', cirviaId], context.previous);
      toast.error('Failed to update like');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cirvia-feed', cirviaId] })
  });

  const allItems = useMemo(() => feedQuery.data?.pages.flatMap((page) => page.items) ?? [], [feedQuery.data]);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cirvia Feed</h1>
        <button
          type="button"
          onClick={() => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
          aria-label="Create a new post"
        >
          New Post
        </button>
      </div>

      <div id="new-post" ref={composerRef}>
        <PostComposer onSubmit={async (contentText) => {
            await createPostMutation.mutateAsync(contentText);
          }} isSubmitting={createPostMutation.isPending} />
      </div>

      {feedQuery.isLoading ? <p>Loading feed...</p> : null}

      {feedQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load feed.
          <button className="ml-2 underline" onClick={() => feedQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="space-y-4">
        {allItems.map((item) => (
          <PostCard key={item.post.id} item={item} onLikeToggle={(postId, shouldLike) => likeMutation.mutate({ postId, shouldLike })} />
        ))}
      </div>

      <div ref={loadMoreRef} aria-hidden="true" />
      {feedQuery.isFetchingNextPage ? <p className="text-sm text-slate-500">Loading more...</p> : null}
    </section>
  );
}
