import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  log(action: string, payload: Record<string, unknown>): void {
    this.logger.log(JSON.stringify({ action, payload }));
  }
}
