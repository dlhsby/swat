import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Acknowledge a deviation alert, optionally with a supervisor note. */
export class AcknowledgeAlertDto {
  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;
}
