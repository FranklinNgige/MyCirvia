import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EXIF_STRIP_JOB, MALWARE_SCAN_JOB, MEDIA_QUEUE } from '../media/media.constants';

@Injectable()
export class QueueService {
  private readonly queue = new Queue(MEDIA_QUEUE, { connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' } });

  async queueExifStrip(key: string) {
    await this.queue.add(EXIF_STRIP_JOB, { key });
  }

  async queueMalwareScan(key: string) {
    await this.queue.add(MALWARE_SCAN_JOB, { key });
  }
}
