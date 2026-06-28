import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Nama peran wajib diisi' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ type: [String], description: 'Permission ids granted to the role' })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true, message: 'Izin tidak valid' })
  permissionIds!: string[];
}
