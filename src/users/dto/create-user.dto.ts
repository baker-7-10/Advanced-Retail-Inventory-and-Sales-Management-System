import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEmail, MinLength, IsEnum, IsOptional, Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User email address', example: 'john@store.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, must contain uppercase, lowercase and a number)',
    example: 'Password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    { message: 'Password must contain uppercase, lowercase and a number' },
  )
  password: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, default: UserRole.EMPLOYEE })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
