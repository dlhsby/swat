import { ApiProperty } from '@nestjs/swagger';

/** Token grant returned to native clients (documents the {@link TokenPair} shape for Swagger). */
export class TokenResponseDto {
  @ApiProperty({ description: 'Short-lived signed JWT (HS256, ~15 min).' })
  readonly accessToken!: string;

  @ApiProperty({ description: 'Opaque "<id>:<secret>" handle; rotated on every refresh.' })
  readonly refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  readonly tokenType!: 'Bearer';

  @ApiProperty({ description: 'Access-token lifetime in seconds.', example: 900 })
  readonly expiresIn!: number;
}
