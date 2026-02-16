import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { CreateCommentDto, CreatePostDto, FeedQueryDto, UpdatePostDto } from './dto/feed.dto';
import { FeedService } from './feed.service';

@Controller()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post('/cirvias/:cirviaId/posts')
  createPost(@Param('cirviaId') cirviaId: string, @Body() dto: CreatePostDto, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.createPost(cirviaId, dto, user);
  }

  @Get('/cirvias/:cirviaId/posts')
  listFeed(@Param('cirviaId') cirviaId: string, @Query() query: FeedQueryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.listFeed(cirviaId, query, user);
  }

  @Get('/posts/:postId')
  getPost(@Param('postId') postId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.getPost(postId, user);
  }

  @Put('/posts/:postId')
  updatePost(@Param('postId') postId: string, @Body() dto: UpdatePostDto, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.updatePost(postId, dto, user);
  }

  @Delete('/posts/:postId')
  deletePost(@Param('postId') postId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.deletePost(postId, user);
  }

  @Post('/posts/:postId/like')
  likePost(@Param('postId') postId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.likePost(postId, user);
  }

  @Delete('/posts/:postId/like')
  unlikePost(@Param('postId') postId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.unlikePost(postId, user);
  }

  @Post('/posts/:postId/comments')
  createComment(@Param('postId') postId: string, @Body() dto: CreateCommentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.createComment(postId, dto, user);
  }

  @Get('/posts/:postId/comments')
  listComments(@Param('postId') postId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.listComments(postId, user);
  }

  @Delete('/comments/:commentId')
  deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.deleteComment(commentId, user);
  }

  @Post('/comments/:commentId/like')
  likeComment(@Param('commentId') commentId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.likeComment(commentId, user);
  }

  @Delete('/comments/:commentId/like')
  unlikeComment(@Param('commentId') commentId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.feedService.unlikeComment(commentId, user);
  }
}
