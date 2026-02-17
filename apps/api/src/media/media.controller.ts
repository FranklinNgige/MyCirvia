import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { ConfirmUploadDto, RequestUploadDto } from './dto/media.dto';
import { MediaService } from './media.service';

@Controller('/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('/request-upload')
  requestUpload(@Body() dto: RequestUploadDto, @CurrentUser() user: CurrentUserPayload) {
    return this.mediaService.requestUpload(dto, user);
  }

  @Post('/confirm-upload')
  confirmUpload(@Body() dto: ConfirmUploadDto, @CurrentUser() user: CurrentUserPayload) {
    return this.mediaService.confirmUpload(dto, user);
  }

  @Get('/*/status')
  getStatus(@Req() req: Request, @CurrentUser() user: CurrentUserPayload) {
    const key = decodeURIComponent((req.params as any)[0]);
    return this.mediaService.getStatus(key, user);
  }

  @Get('/*/url')
  getUrl(@Req() req: Request, @CurrentUser() user: CurrentUserPayload) {
    const key = decodeURIComponent((req.params as any)[0]);
    return this.mediaService.getSignedUrl(key, user);
  }
}
