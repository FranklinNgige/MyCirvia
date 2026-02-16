export type CreatePostDto = {
  contentText: string;
  mediaKeys?: string[];
};

export type UpdatePostDto = {
  contentText: string;
};

export type FeedQueryDto = {
  limit?: string;
  cursor?: string;
  sortBy?: 'createdAt';
};

export type CreateCommentDto = {
  contentText: string;
  parentCommentId?: string;
};
