import { Injectable, Logger } from '@nestjs/common';
import { AuditEvent } from '../audit/audit-event.enum';

export interface AuditLogMetadata {
  userId?: number;
  email?: string;
  ip?: string;
  reason?: string;
  productId?: number;
}

export interface AuditLogEntry {
  event: AuditEvent;
  metadata: AuditLogMetadata & { timestamp: string };
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  log(event: AuditEvent, metadata: AuditLogMetadata): void {
    const entry: AuditLogEntry = {
      event,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    };

    const message = JSON.stringify(entry);

    switch (event) {
      case AuditEvent.LOGIN_SUCCESS:
        this.logger.log(message);
        break;
      case AuditEvent.LOGIN_FAILED:
        this.logger.warn(message);
        break;
      case AuditEvent.ACCOUNT_LOCKED:
        this.logger.warn(message);
        break;
      case AuditEvent.TOKEN_REFRESHED:
        this.logger.log(message);
        break;
      default:
        this.logger.log(message);
        break;
    }
  }
}
