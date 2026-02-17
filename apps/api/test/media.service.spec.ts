import { BadRequestException } from '@nestjs/common';
import { MediaService } from '../src/media/media.service';

describe('MediaService', () => {
  const s3MediaService = {
    createUploadPolicy: jest.fn().mockResolvedValue({ url: 'https://s3.example/upload', fields: { key: 'k' } }),
    objectExists: jest.fn().mockResolvedValue(true),
    signedGetUrl: jest.fn().mockResolvedValue('https://s3.example/get'),
  } as any;
  const queueService = { queueExifStrip: jest.fn(), queueMalwareScan: jest.fn() } as any;
  const mediaRepository = { upsert: jest.fn(), getStatus: jest.fn().mockReturnValue('processing') } as any;
  const service = new MediaService(s3MediaService, queueService, mediaRepository);

  beforeEach(() => jest.clearAllMocks());

  it('validates file type and size', async () => {
    await expect(
      service.requestUpload(
        { fileName: 'evil.gif', fileType: 'image/gif', fileSize: 200, context: 'POST' },
        { userId: 'user-1', email: 'a@b.com', role: 'member' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.requestUpload(
        { fileName: 'big.png', fileType: 'image/png', fileSize: 12 * 1024 * 1024, context: 'POST' },
        { userId: 'user-1', email: 'a@b.com', role: 'member' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates presigned upload payload', async () => {
    const result = await service.requestUpload(
      { fileName: 'photo.png', fileType: 'image/png', fileSize: 5000, context: 'POST' },
      { userId: 'user-1', email: 'a@b.com', role: 'member' },
    );

    expect(result.uploadUrl).toBe('https://s3.example/upload');
    expect(result.key).toMatch(/^POST\/user-1\/.+\.png$/);
    expect(s3MediaService.createUploadPolicy).toHaveBeenCalled();
  });
});
