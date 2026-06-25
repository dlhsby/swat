import { Body, Controller, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { type Request } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { ApiAuditService } from '../api-audit.service';

import { GpsIngestQueue } from './gps-ingest.queue';
import { GpsWebhookGuard } from './gps-webhook.guard';
import { normalizeGpsidPayload } from './gpsid-normalizer';

const WEBHOOK_PRINCIPAL = 'GPS.id Webhook';

/**
 * GPS.id push webhook (Phase 7, T-705). Vendor-unauthenticated, so it is `@Public`
 * (bypasses the session guard) and instead secured by {@link GpsWebhookGuard}
 * (secret path token + IP allowlist + per-IP rate limit + audit). Accepts a single
 * record OR an array; validates + normalizes each independently, enqueues the
 * valid ones to the `gps-ingest` worker, and responds fast with the counts.
 * Excluded from Swagger (the token lives in the path).
 */
@ApiExcludeController()
@Controller('integrations/gps/webhook')
export class GpsWebhookController {
  constructor(
    private readonly ingest: GpsIngestQueue,
    private readonly apiAudit: ApiAuditService,
  ) {}

  @Post(':token')
  @Public()
  @UseGuards(GpsWebhookGuard)
  @HttpCode(200)
  async receive(
    @Param('token') _token: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<{ accepted: number; rejected: number }> {
    const { pings, accepted, rejected } = normalizeGpsidPayload(body);
    await this.ingest.enqueue(pings);
    // Audit the accepted call (rejections are audited by the guard). Coarse,
    // secret-free summary — never the payload.
    await this.apiAudit.logWebhook({
      request,
      statusCode: 200,
      principalName: WEBHOOK_PRINCIPAL,
      requestSummary: `accepted=${accepted} rejected=${rejected}`,
    });
    return { accepted, rejected };
  }
}
