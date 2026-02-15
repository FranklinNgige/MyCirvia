import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  notifyUser(_userId: string, _payload: Record<string, unknown>): void {
    // intentionally blank
  }

  notifyCirviaAdmins(_cirviaId: string, _payload: Record<string, unknown>): void {
    // intentionally blank
  }
}
