import { AuditEvent } from '../../../../src/common/audit/audit-event.enum';

describe('AuditEvent Enum', () => {
  it('should have all auth events', () => {
    expect(AuditEvent.LOGIN_SUCCESS).toBe('LOGIN_SUCCESS');
    expect(AuditEvent.LOGIN_FAILED).toBe('LOGIN_FAILED');
    expect(AuditEvent.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED');
    expect(AuditEvent.TOKEN_REFRESHED).toBe('TOKEN_REFRESHED');
  });

  it('should have all user events', () => {
    expect(AuditEvent.USER_CREATED).toBe('USER_CREATED');
    expect(AuditEvent.USER_UPDATED).toBe('USER_UPDATED');
    expect(AuditEvent.USER_DEACTIVATED).toBe('USER_DEACTIVATED');
  });

  it('should have all category events', () => {
    expect(AuditEvent.CATEGORY_CREATED).toBe('CATEGORY_CREATED');
    expect(AuditEvent.CATEGORY_UPDATED).toBe('CATEGORY_UPDATED');
    expect(AuditEvent.CATEGORY_DEACTIVATED).toBe('CATEGORY_DEACTIVATED');
  });

  it('should have all product events', () => {
    expect(AuditEvent.PRODUCT_CREATED).toBe('PRODUCT_CREATED');
    expect(AuditEvent.PRODUCT_UPDATED).toBe('PRODUCT_UPDATED');
    expect(AuditEvent.PRODUCT_DEACTIVATED).toBe('PRODUCT_DEACTIVATED');
  });

  it('should have all inventory events', () => {
    expect(AuditEvent.INVENTORY_UPDATED).toBe('INVENTORY_UPDATED');
    expect(AuditEvent.LOW_STOCK).toBe('LOW_STOCK');
    expect(AuditEvent.OUT_OF_STOCK).toBe('OUT_OF_STOCK');
  });

  it('should have all sale events', () => {
    expect(AuditEvent.SALE_CREATED).toBe('SALE_CREATED');
    expect(AuditEvent.SALE_COMPLETED).toBe('SALE_COMPLETED');
    expect(AuditEvent.SALE_CANCELLED).toBe('SALE_CANCELLED');
    expect(AuditEvent.SALE_REFUNDED).toBe('SALE_REFUNDED');
  });

  it('should have report event', () => {
    expect(AuditEvent.REPORT_GENERATED).toBe('REPORT_GENERATED');
  });
});
