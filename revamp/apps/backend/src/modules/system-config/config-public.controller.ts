import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { SystemConfigService } from '../../config';

/**
 * Unauthenticated public runtime config for the web app — currently the browser
 * Google Maps key (referrer-restricted, public by design). Lets the key be edited
 * from the admin settings instead of baked into the web build. Cached by the client.
 */
@ApiTags('config')
@Controller('config/public')
export class ConfigPublicController {
  constructor(private readonly config: SystemConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public runtime config (browser Maps key)' })
  get(): { maps: { browserKey: string | null } } {
    return { maps: { browserKey: this.config.getGoogleMapsBrowserKey() ?? null } };
  }
}
