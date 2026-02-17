'use client';

import { apiClient } from '@/lib/api/client';
import type {
  CommentNode,
  CreateCommentInput,
  CreatePostInput,
  FeedPage,
  FeedPostContext,
  LikeCountResponse,
  PostCommentsResponse,
  ResolvedIdentityDTO
} from '@/lib/types';

type ApiComment = Omit<CommentNode, 'author' | 'likedByCurrentUser' | 'replies'> & {
  author: ResolvedIdentityDTO;
  replies: ApiComment[];
};

export async function getCirviaFeed(cirviaId: string, cursor?: string | null): Promise<FeedPage> {
  const params = new URLSearchParams();
  params.set('limit', '10');
  if (cursor) params.set('cursor', cursor);
  const { data } = await apiClient.get(`/cirvias/${cirviaId}/posts?${params.toString()}`);
  return data;
}

export async function createPost(cirviaId: string, payload: CreatePostInput): Promise<FeedPostContext> {
  const { data } = await apiClient.post(`/cirvias/${cirviaId}/posts`, payload);
  return data;
}

export async function getPost(postId: string): Promise<FeedPostContext> {
  const { data } = await apiClient.get(`/posts/${postId}`);
  return data;
}

export async function likePost(postId: string): Promise<LikeCountResponse> {
  const { data } = await apiClient.post(`/posts/${postId}/like`);
  return data;
}

export async function unlikePost(postId: string): Promise<LikeCountResponse> {
  const { data } = await apiClient.delete(`/posts/${postId}/like`);
  return data;
}

export async function getPostComments(postId: string): Promise<PostCommentsResponse> {
  const { data } = await apiClient.get(`/posts/${postId}/comments`);
  return { items: data.items.map(normalizeComment) };
}

export async function createComment(postId: string, payload: CreateCommentInput): Promise<{ comment: CommentNode }> {
  const { data } = await apiClient.post(`/posts/${postId}/comments`, payload);
  return {
    comment: {
      ...data.comment,
      author: data.author,
      likeCount: data.likeCount,
      likedByCurrentUser: false,
      replies: []
    }
  };
}

export async function likeComment(commentId: string): Promise<LikeCountResponse> {
  const { data } = await apiClient.post(`/comments/${commentId}/like`);
  return data;
}

export async function unlikeComment(commentId: string): Promise<LikeCountResponse> {
  const { data } = await apiClient.delete(`/comments/${commentId}/like`);
  return data;
}

function normalizeComment(comment: ApiComment): CommentNode {
  return {
    ...comment,
    likedByCurrentUser: false,
    replies: comment.replies.map(normalizeComment)
  };
}
