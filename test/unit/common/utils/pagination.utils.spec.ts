import { isPaginatedResponse } from '../../../../src/common/utils/pagination.utils';

describe('isPaginatedResponse', () => {
  it('should return true for data + meta', () => {
    const result = isPaginatedResponse({ data: [], meta: { page: 1 } });
    expect(result).toBe(true);
  });

  it('should return true for items + meta', () => {
    const result = isPaginatedResponse({ items: [], meta: { page: 1 } });
    expect(result).toBe(true);
  });

  it('should return true for results + meta', () => {
    const result = isPaginatedResponse({ results: [], meta: { page: 1 } });
    expect(result).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPaginatedResponse(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isPaginatedResponse(undefined)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(isPaginatedResponse({ id: 1, name: 'test' })).toBe(false);
  });

  it('should return false for array', () => {
    expect(isPaginatedResponse([{ id: 1 }])).toBe(false);
  });

  it('should return false when meta is missing', () => {
    expect(isPaginatedResponse({ items: [] })).toBe(false);
  });

  it('should return false when data is not an array', () => {
    expect(isPaginatedResponse({ data: 'string', meta: { page: 1 } })).toBe(false);
  });
});
