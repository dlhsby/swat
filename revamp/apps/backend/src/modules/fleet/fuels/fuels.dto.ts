import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateFuelDto {
  @ApiProperty()
  @IsString({ message: 'Kategori bahan bakar wajib dipilih' })
  fuelCategoryId!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ minimum: 0, description: 'Price per liter in IDR' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Harga tidak boleh negatif' })
  pricePerLiter!: number;
}

export class UpdateFuelDto extends PartialType(CreateFuelDto) {}

export class ListFuelsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fuelCategoryId?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
