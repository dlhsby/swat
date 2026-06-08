import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Nama peran wajib diisi' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ type: [Number], description: 'Permission ids granted to the role' })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true, message: 'Izin tidak valid' })
  @Min(1, { each: true })
  permissionIds!: number[];
}
