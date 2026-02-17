import { ExifStrippingJob } from '../src/workers/jobs/exif-stripping.job';

const sharp = require('sharp');

describe('ExifStrippingJob', () => {
  it('processes image and marks media ready', async () => {
    const input = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ff0000' } }).jpeg().toBuffer();

    const s3MediaService = {
      download: jest.fn().mockResolvedValue(input),
      upload: jest.fn().mockResolvedValue(undefined),
    } as any;
    const mediaRepository = { updateStatus: jest.fn() } as any;

    const job = new ExifStrippingJob(s3MediaService, mediaRepository);
    await job.process('POST/user-1/file.jpg');

    expect(s3MediaService.upload).toHaveBeenCalled();
    expect(mediaRepository.updateStatus).toHaveBeenCalledWith('POST/user-1/file.jpg', 'ready');
  });
});
