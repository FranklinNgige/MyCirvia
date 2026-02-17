export type AgeRange = '13-17' | '18-24' | '25-34' | '35-44' | '45+';
export type Gender = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  email: string;
}

export interface ResolvedIdentityDTO {
  avatarUrl?: string | null;
  displayName: string;
}

export interface CirviaMember {
  id: string;
  resolvedIdentity: ResolvedIdentityDTO;
}

export interface CirviaSummary {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  resolvedIdentity: ResolvedIdentityDTO;
}

export interface CirviaDetail extends CirviaSummary {
  visibility: 'public' | 'private';
  requireApproval: boolean;
  maxMembers?: number | null;
  members: CirviaMember[];
}

export interface JoinPreview {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  requiresApproval: boolean;
}

export interface FeedPost {
  id: string;
  cirviaId: string;
  authorId: string;
  contentText: string;
  mediaKeys: string[];
  visibility: string;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FeedPostContext {
  post: FeedPost;
  author: ResolvedIdentityDTO;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
}

export interface FeedPage {
  items: FeedPostContext[];
  nextCursor: string | null;
}

export interface CommentNode {
  id: string;
  postId: string;
  authorId: string;
  contentText: string;
  parentCommentId?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  author: ResolvedIdentityDTO;
  likeCount: number;
  likedByCurrentUser?: boolean;
  replies: CommentNode[];
}

export interface PostCommentsResponse {
  items: CommentNode[];
}

export interface CreatePostInput {
  contentText: string;
  mediaKeys?: string[];
}

export interface CreateCommentInput {
  contentText: string;
  parentCommentId?: string;
}

export interface LikeCountResponse {
  likeCount: number;
}
