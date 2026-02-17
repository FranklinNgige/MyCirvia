export const MEDIA_QUEUE = 'media-processing';
export const EXIF_STRIP_JOB = 'exif-strip';
export const MALWARE_SCAN_JOB = 'malware-scan';

export const ALLOWED_TYPES: Record<string, { ext: string; maxSize: number; kind: 'image' | 'video' }> = {
  'image/jpeg': { ext: 'jpg', maxSize: 10 * 1024 * 1024, kind: 'image' },
  'image/png': { ext: 'png', maxSize: 10 * 1024 * 1024, kind: 'image' },
  'image/webp': { ext: 'webp', maxSize: 10 * 1024 * 1024, kind: 'image' },
  'video/mp4': { ext: 'mp4', maxSize: 50 * 1024 * 1024, kind: 'video' },
};
