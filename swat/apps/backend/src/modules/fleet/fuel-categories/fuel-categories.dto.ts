import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateFuelCategoryDto {
  @ApiProperty({ maxLength: 20, description: 'Fuel category, e.g. "Bersubsidi"' })
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(20)
  name!: string;
}

export class UpdateFuelCategoryDto extends PartialType(CreateFuelCategoryDto) {}

export class ListFuelCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  search?: string;
}
