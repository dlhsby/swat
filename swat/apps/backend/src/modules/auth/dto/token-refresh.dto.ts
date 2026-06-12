import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class TokenRefreshDto {
  @ApiProperty({ description: 'The opaque refresh token from a prior token grant.' })
  @IsString()
  @MinLength(1, { message: 'Refresh token wajib diisi' })
  @MaxLength(512)
  refreshToken!: string;
}
