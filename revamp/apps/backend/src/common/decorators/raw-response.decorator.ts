import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE = 'skipEnvelope';

/**
 * Opt a route out of the {@link ApiResponseInterceptor} envelope. Needed for
 * streaming responses (SSE) where each emission must reach the client raw, not
 * wrapped in `{ success, data }`. Use sparingly — REST routes keep the envelope.
 */
export const RawResponse = (): MethodDecorator & ClassDecorator => SetMetadata(SKIP_ENVELOPE, true);
