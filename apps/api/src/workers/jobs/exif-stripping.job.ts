import { Injectable, Logger } from '@nestjs/common';
import { MediaRepository } from '../../media/media.repository';
import { S3MediaService } from '../../media/s3-media.service';

const sharp = require('sharp');

@Injectable()
export class ExifStrippingJob {
  private readonly logger = new Logger(ExifStrippingJob.name);

  constructor(
    private readonly s3MediaService: S3MediaService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  async process(key: string) {
    try {
      if (!key.match(/\.(jpg|jpeg|png|webp)$/i)) {
        this.mediaRepository.updateStatus(key, 'ready');
        return;
      }
      const original = await this.s3MediaService.download(key);
      const cleaned = await sharp(original).rotate().toBuffer();
      const contentType = key.endsWith('.png') ? 'image/png' : key.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      await this.s3MediaService.upload(key, cleaned, contentType);
      this.mediaRepository.updateStatus(key, 'ready');
    } catch (error) {
      this.logger.error(`EXIF stripping failed for ${key}`, error as Error);
      this.mediaRepository.updateStatus(key, 'failed');
      throw error;
    }
  }
}
