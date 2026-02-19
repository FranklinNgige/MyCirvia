import { createServer } from 'http';
import { Worker } from 'bullmq';
import { env } from '../env';
import { EXIF_STRIP_JOB, MALWARE_SCAN_JOB, MEDIA_QUEUE } from '../media/media.constants';
import { MediaRepository } from '../media/media.repository';
import { S3MediaService } from '../media/s3-media.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExifStrippingJob } from './jobs/exif-stripping.job';
import { MalwareScanJob } from './jobs/malware-scan.job';
import { StubMalwareScanner } from './scanners/malware-scanner.interface';

const prisma = new PrismaService();
const mediaRepository = new MediaRepository(prisma);
const s3MediaService = new S3MediaService();
const exifStrippingJob = new ExifStrippingJob(s3MediaService, mediaRepository);
const malwareScanJob = new MalwareScanJob(new StubMalwareScanner(), mediaRepository);

const worker = new Worker(
  MEDIA_QUEUE,
  async (job) => {
    const key = job.data.key as string;
    if (job.name === EXIF_STRIP_JOB) return exifStrippingJob.process(key);
    if (job.name === MALWARE_SCAN_JOB) return malwareScanJob.process(key);
    throw new Error(`Unknown job ${job.name}`);
  },
  { connection: { url: env.REDIS_URL } },
);

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.name} failed`, error);
});

const workerHealthPort = Number(process.env.WORKER_HEALTH_PORT ?? 3100);
const healthServer = createServer((req, res) => {
  if (req.url === '/workers/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', queue: MEDIA_QUEUE }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'not_found' }));
});

healthServer.listen(workerHealthPort, () => {
  console.info(`Media worker health endpoint listening on :${workerHealthPort}`);
});

const shutdown = async () => {
  await Promise.allSettled([worker.close(), healthServer.close(), Promise.resolve(prisma.onModuleDestroy())]);
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

console.info('Media worker started');
