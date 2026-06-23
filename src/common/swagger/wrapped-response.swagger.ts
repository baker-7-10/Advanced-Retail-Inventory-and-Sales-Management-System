import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

export class WrappedResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional({ example: 'Operation successful', nullable: true })
  message: string | null;

  data: T;
}

/**
 * Returns an inline Swagger schema that wraps a DTO type in { success, message, data }.
 * Use as the `schema` option of @ApiOkResponse / @ApiCreatedResponse.
 */
export function WrappedSchema(dto: Type<any>) {
  return {
    allOf: [
      {
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', nullable: true, example: null },
          data: { $ref: getSchemaPath(dto) },
        },
      },
    ],
  };
}

/**
 * Like WrappedSchema but for array responses: data is an array of dto.
 */
export function WrappedArraySchema(dto: Type<any>) {
  return {
    allOf: [
      {
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', nullable: true, example: null },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(dto) },
          },
        },
      },
    ],
  };
}
