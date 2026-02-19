import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EXIF_STRIP_JOB, MALWARE_SCAN_JOB, MEDIA_QUEUE } from '../media/media.constants';
import { env } from '../env';

@Injectable()
export class QueueService {
  private readonly queue = new Queue(MEDIA_QUEUE, { connection: { url: env.REDIS_URL } });

  async queueExifStrip(key: string) {
    await this.queue.add(EXIF_STRIP_JOB, { key });
  }

  async queueMalwareScan(key: string) {
    await this.queue.add(MALWARE_SCAN_JOB, { key });
  }
}
