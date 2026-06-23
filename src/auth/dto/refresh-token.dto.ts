import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token issued at login (7d expiry)',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  @IsString()
  refreshToken: string;
}
