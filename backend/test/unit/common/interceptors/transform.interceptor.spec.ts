import { TransformInterceptor } from '../../../../src/common/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let reflector: jest.Mocked<Reflector>;

  function mockContext(message?: string) {
    reflector.getAllAndOverride.mockReturnValue(message ?? null);
    return {
      switchToHttp: () => ({}),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }

  function mockCallHandler(data: any) {
    return { handle: () => of(data) };
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    interceptor = new TransformInterceptor(reflector);
  });

  it('should wrap normal response with success and data', (done) => {
    const context = mockContext();
    const data = { id: 1, name: 'Test' };

    interceptor.intercept(context, mockCallHandler(data)).subscribe((result) => {
      expect(result).toEqual({ success: true, message: null, data });
      done();
    });
  });

  it('should include success message when provided', (done) => {
    const context = mockContext('Created successfully');
    const data = { id: 1 };

    interceptor.intercept(context, mockCallHandler(data)).subscribe((result) => {
      expect(result).toEqual({ success: true, message: 'Created successfully', data });
      done();
    });
  });

  it('should pass null through unmodified', (done) => {
    const context = mockContext();

    interceptor.intercept(context, mockCallHandler(null)).subscribe((result) => {
      expect(result).toBeNull();
      done();
    });
  });

  it('should pass undefined through unmodified', (done) => {
    const context = mockContext();

    interceptor.intercept(context, mockCallHandler(undefined)).subscribe((result) => {
      expect(result).toBeUndefined();
      done();
    });
  });

  it('should wrap array response in data', (done) => {
    const context = mockContext();
    const data = [{ id: 1 }, { id: 2 }];

    interceptor.intercept(context, mockCallHandler(data)).subscribe((result) => {
      expect(result).toEqual({ success: true, message: null, data });
      done();
    });
  });

  it('should detect paginated response with data+meta', (done) => {
    const context = mockContext();
    const paginated = {
      data: [{ id: 1 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    interceptor.intercept(context, mockCallHandler(paginated)).subscribe((result: any) => {
      expect(result.success).toBe(true);
      expect(result.data.items).toEqual([{ id: 1 }]);
      expect(result.data.meta).toEqual(paginated.meta);
      done();
    });
  });

  it('should detect paginated response with items+meta', (done) => {
    const context = mockContext();
    const paginated = {
      items: [{ id: 1 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    interceptor.intercept(context, mockCallHandler(paginated)).subscribe((result: any) => {
      expect(result.success).toBe(true);
      expect(result.data.items).toEqual([{ id: 1 }]);
      expect(result.data.meta).toEqual(paginated.meta);
      done();
    });
  });

  it('should detect paginated response with results+meta', (done) => {
    const context = mockContext();
    const paginated = {
      results: [{ id: 1 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    interceptor.intercept(context, mockCallHandler(paginated)).subscribe((result: any) => {
      expect(result.success).toBe(true);
      expect(result.data.items).toEqual([{ id: 1 }]);
      expect(result.data.meta).toEqual(paginated.meta);
      done();
    });
  });
});
