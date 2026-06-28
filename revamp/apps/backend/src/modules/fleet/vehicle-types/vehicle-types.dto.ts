import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateApplicationDto {
  @ApiProperty({ maxLength: 100, description: 'Vehicle type, e.g. "Compactor"' })
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi' })
  @MaxLength(100)
  name!: string;
}

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}

export class ListApplicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
