import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/** Self-service personal preferences (theme + UI language). */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: ['system', 'light', 'dark'] })
  @IsOptional()
  @IsIn(['system', 'light', 'dark'], { message: 'theme harus system/light/dark' })
  theme?: string;

  @ApiPropertyOptional({ enum: ['id-ID', 'en-US'] })
  @IsOptional()
  @IsIn(['id-ID', 'en-US'], { message: 'locale harus id-ID/en-US' })
  locale?: string;
}
