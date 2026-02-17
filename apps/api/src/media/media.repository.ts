import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type MediaStatus = 'processing' | 'ready' | 'failed';

@Injectable()
export class MediaRepository {
  constructor(private readonly db: PrismaService) {}

  upsert(key: string, userId: string, status: MediaStatus) {
    this.db.run(
      `INSERT INTO "Media" (id, key, userId, status, createdAt, updatedAt)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET status=excluded.status, updatedAt=CURRENT_TIMESTAMP`,
      [key, userId, status],
    );
  }

  updateStatus(key: string, status: MediaStatus) {
    this.db.run(`UPDATE "Media" SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?`, [status, key]);
  }

  getStatus(key: string): MediaStatus | null {
    const row = this.db.get<{ status: MediaStatus }>(`SELECT status FROM "Media" WHERE key = ?`, [key]);
    return row?.status ?? null;
  }
}
