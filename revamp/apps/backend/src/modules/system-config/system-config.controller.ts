import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../common/auth/session.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { type ConfigDescription, SystemConfigService } from '../../config';

import { SetConfigDto } from './dto/set-config.dto';

/**
 * Admin-only runtime system settings (GPS.id creds, Maps keys, GPS thresholds,
 * weighbridge). A value here OVERRIDES its env var; clearing reverts to env/default.
 * Secret values are write-only — the list never returns them.
 */
@ApiTags('system-config')
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly config: SystemConfigService) {}

  @Get()
  @RequirePermissions('system-config:manage')
  @ApiOperation({ summary: 'List all configurable settings + their current state (secrets masked)' })
  list(): ConfigDescription[] {
    return this.config.describe();
  }

  @Patch(':key')
  @RequirePermissions('system-config:manage')
  @ApiOperation({ summary: 'Set a setting (overrides its env var)' })
  async set(
    @Param('key') key: string,
    @Body() dto: SetConfigDto,
    @CurrentUser() user: SessionUser,
  ): Promise<{ message: string }> {
    await this.config.set(key, dto.value, user.id);
    return { message: 'Setelan disimpan.' };
  }

  @Delete(':key')
  @RequirePermissions('system-config:manage')
  @ApiOperation({ summary: 'Clear a setting (revert to env / default)' })
  async clear(@Param('key') key: string): Promise<{ message: string }> {
    await this.config.clear(key);
    return { message: 'Setelan dikembalikan ke bawaan.' };
  }
}
