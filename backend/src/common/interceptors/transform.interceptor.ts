import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SUCCESS_MESSAGE_KEY } from '../decorators/success-message.decorator';
import { isPaginatedResponse } from '../utils/pagination.utils';

export interface WrappedResponse<T> {
  success: boolean;
  message?: string | null;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T> | T> {

  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<WrappedResponse<T> | T> {
    const message = this.reflector.getAllAndOverride<string>(
      SUCCESS_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((rawData) => {
        if (rawData === undefined || rawData === null) {
          return rawData;
        }

        if (isPaginatedResponse(rawData)) {
          const items = (rawData as any).data ?? (rawData as any).items ?? (rawData as any).results ?? [];
          return {
            success: true,
            message: message ?? null,
            data: {
              items,
              meta: (rawData as any).meta,
            },
          };
        }

        return {
          success: true,
          message: message ?? null,
          data: rawData,
        };
      }),
    );
  }
}
