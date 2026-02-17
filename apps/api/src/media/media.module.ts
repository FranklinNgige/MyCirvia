import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { MediaController } from './media.controller';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';
import { S3MediaService } from './s3-media.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, S3MediaService, QueueService, MediaRepository, PrismaService],
  exports: [MediaRepository, S3MediaService],
})
export class MediaModule {}
