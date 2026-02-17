import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
import { QueueService } from '../queue/queue.service';
import { ALLOWED_TYPES } from './media.constants';
import { ConfirmUploadDto, RequestUploadDto } from './dto/media.dto';
import { MediaRepository } from './media.repository';
import { S3MediaService } from './s3-media.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly s3MediaService: S3MediaService,
    private readonly queueService: QueueService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  async requestUpload(dto: RequestUploadDto, user: CurrentUserPayload) {
    const typeRule = ALLOWED_TYPES[dto.fileType];
    if (!typeRule) throw new BadRequestException('Unsupported file type');
    if (dto.fileSize > typeRule.maxSize) throw new BadRequestException('File exceeds size limit');

    const extension = this.getExtension(dto.fileName);
    if (extension !== typeRule.ext && !(typeRule.ext === 'jpg' && extension === 'jpeg')) {
      throw new BadRequestException('File extension does not match MIME type');
    }

    const safeContext = dto.context.replace(/[^A-Z_]/g, '');
    const safeUserId = user.userId.replace(/[^a-zA-Z0-9-]/g, '');
    const key = `${safeContext}/${safeUserId}/${randomUUID()}.${typeRule.ext}`;

    const presigned = await this.s3MediaService.createUploadPolicy(key, dto.fileType, typeRule.maxSize);
    return { uploadUrl: presigned.url, fields: presigned.fields, key };
  }

  async confirmUpload(dto: ConfirmUploadDto, user: CurrentUserPayload) {
    if (!this.belongsToUser(dto.key, user.userId)) throw new BadRequestException('Invalid media key');
    const exists = await this.s3MediaService.objectExists(dto.key);
    if (!exists) throw new NotFoundException('Uploaded file not found');

    this.mediaRepository.upsert(dto.key, user.userId, 'processing');
    await this.queueService.queueExifStrip(dto.key);
    await this.queueService.queueMalwareScan(dto.key);
    return { key: dto.key, status: 'processing' };
  }

  getStatus(key: string, user: CurrentUserPayload) {
    if (!this.belongsToUser(key, user.userId)) throw new BadRequestException('Invalid media key');
    return { status: this.mediaRepository.getStatus(key) ?? 'processing' };
  }

  async getSignedUrl(key: string, user: CurrentUserPayload) {
    if (!this.belongsToUser(key, user.userId)) throw new BadRequestException('Invalid media key');
    return { url: await this.s3MediaService.signedGetUrl(key) };
  }

  private getExtension(fileName: string) {
    if (fileName.includes('..')) throw new BadRequestException('Invalid file name');
    return (fileName.split('.').pop() ?? '').toLowerCase();
  }

  private belongsToUser(key: string, userId: string) {
    const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '');
    return key.startsWith('POST/') || key.startsWith('PROFILE_PHOTO/') || key.startsWith('AVATAR/') || key.startsWith('MESSAGE/')
      ? key.includes(`/${safeUserId}/`)
      : false;
  }
}
