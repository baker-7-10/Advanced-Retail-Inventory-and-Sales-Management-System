import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../../../../src/common/filters/global-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

function mockArgumentsHost(url = '/test', method = 'GET') {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const getResponse = jest.fn(() => ({ status }));
  const getRequest = jest.fn(() => ({ url, method }));
  const switchToHttp = jest.fn(() => ({ getResponse, getRequest }));
  const host = { switchToHttp };
  return { host, json, status };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException with message', () => {
    const { host, json, status } = mockArgumentsHost();
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not found',
        path: '/test',
      }),
    );
  });

  it('should handle HttpException with object response', () => {
    const { host, json, status } = mockArgumentsHost();
    const exception = new HttpException(
      { message: ['name must be a string'] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['name must be a string'],
      }),
    );
  });

  it('should handle QueryFailedError', () => {
    const { host, json, status } = mockArgumentsHost();
    const exception = new QueryFailedError('SELECT *', [], new Error('Duplicate entry'));

    filter.catch(exception, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database operation failed',
      }),
    );
  });

  it('should handle TypeError', () => {
    const { host, json, status } = mockArgumentsHost();
    const exception = new TypeError('Cannot read property of undefined');

    filter.catch(exception, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('should handle unknown error', () => {
    const { host, json, status } = mockArgumentsHost();
    const exception = 'string error';

    filter.catch(exception, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });
});
