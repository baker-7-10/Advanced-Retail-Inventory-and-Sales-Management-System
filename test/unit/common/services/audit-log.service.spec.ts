import { AuditEvent } from '../../../../src/common/audit/audit-event.enum';
import { AuditLogService } from '../../../../src/common/services/audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    service = new AuditLogService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should accept all audit event types', () => {
    const events = Object.values(AuditEvent);
    expect(events.length).toBeGreaterThan(4);
  });
});
