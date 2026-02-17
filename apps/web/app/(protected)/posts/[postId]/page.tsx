'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CommentCard } from '@/components/comment-card';
import { CommentComposer } from '@/components/comment-composer';
import { PostCard } from '@/components/post-card';
import {
  createComment,
  getPost,
  getPostComments,
  likeComment,
  likePost,
  unlikeComment,
  unlikePost
} from '@/lib/api/feed';
import type { CommentNode, FeedPostContext } from '@/lib/types';

export default function SinglePostPage() {
  const params = useParams<{ postId: string }>();
  const postId = params.postId;
  const queryClient = useQueryClient();

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId),
    refetchInterval: 30000
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getPostComments(postId),
    refetchInterval: 30000
  });

  const postLikeMutation = useMutation({
    mutationFn: ({ shouldLike }: { shouldLike: boolean }) => (shouldLike ? likePost(postId) : unlikePost(postId)),
    onMutate: async ({ shouldLike }) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const previous = queryClient.getQueryData<FeedPostContext>(['post', postId]);
      queryClient.setQueryData<FeedPostContext>(['post', postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          likedByCurrentUser: shouldLike,
          likeCount: Math.max(0, old.likeCount + (shouldLike ? 1 : -1))
        };
      });
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(['post', postId], context.previous);
      toast.error('Failed to update post like');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['post', postId] })
  });

  const commentMutation = useMutation({
    mutationFn: ({ contentText, parentCommentId }: { contentText: string; parentCommentId?: string }) =>
      createComment(postId, { contentText, parentCommentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
    onError: () => toast.error('Unable to publish comment')
  });

  const commentLikeMutation = useMutation({
    mutationFn: ({ commentId, shouldLike }: { commentId: string; shouldLike: boolean }) =>
      shouldLike ? likeComment(commentId) : unlikeComment(commentId),
    onMutate: async ({ commentId, shouldLike }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      const previous = queryClient.getQueryData<{ items: CommentNode[] }>(['comments', postId]);
      queryClient.setQueryData<{ items: CommentNode[] }>(['comments', postId], (old) => {
        if (!old) return old;
        return { items: updateCommentLike(old.items, commentId, shouldLike) };
      });
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(['comments', postId], context.previous);
      toast.error('Failed to update comment like');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] })
  });

  if (postQuery.isLoading) return <p>Loading post...</p>;
  if (!postQuery.data) return <p>Post not found.</p>;

  return (
    <section className="space-y-4">
      <PostCard
        item={postQuery.data}
        onLikeToggle={(_id, shouldLike) => {
          postLikeMutation.mutate({ shouldLike });
        }}
      />

      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Comments</h2>
        <CommentComposer
          onSubmit={async (contentText) => {
            await commentMutation.mutateAsync({ contentText });
          }}
          isSubmitting={commentMutation.isPending}
        />

        {commentsQuery.isError ? (
          <div className="mt-3 text-sm text-red-700">
            Failed to load comments.
            <button className="ml-2 underline" onClick={() => commentsQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {(commentsQuery.data?.items ?? []).map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onLikeToggle={(commentId, shouldLike) => commentLikeMutation.mutate({ commentId, shouldLike })}
              onReply={async (parentCommentId, contentText) => {
                await commentMutation.mutateAsync({ parentCommentId, contentText });
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function updateCommentLike(items: CommentNode[], targetId: string, shouldLike: boolean): CommentNode[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return {
        ...item,
        likedByCurrentUser: shouldLike,
        likeCount: Math.max(0, item.likeCount + (shouldLike ? 1 : -1)),
        replies: updateCommentLike(item.replies, targetId, shouldLike)
      };
    }

    return { ...item, replies: updateCommentLike(item.replies, targetId, shouldLike) };
  });
}
