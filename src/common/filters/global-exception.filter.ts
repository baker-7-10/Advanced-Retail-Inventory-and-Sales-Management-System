import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'object' &&
        'message' in (exceptionResponse as object)
          ? (exceptionResponse as any).message
          : exception.message;

      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} - ${status}`,
          exception.stack,
        );
      }

      return response.status(status).json({
        success: false,
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof QueryFailedError) {
      this.logger.error(
        `${request.method} ${request.url} - QueryFailedError`,
        exception.stack,
      );

      return response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database operation failed',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    this.logger.error(
      `${request.method} ${request.url} - Unhandled exception`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
