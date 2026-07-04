import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

/** Set a system-config value. Always a string; the catalog coerces + validates by
 *  key (numbers/booleans are sent as their string form). */
export class SetConfigDto {
  @ApiProperty({ description: 'The value to store (string form).' })
  @IsString()
  @MaxLength(2000)
  value!: string;
}
