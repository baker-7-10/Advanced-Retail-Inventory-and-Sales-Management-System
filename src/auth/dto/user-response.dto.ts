import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User email address',
    example: 'admin@store.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  role: UserRole;
}
