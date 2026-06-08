import { Global, Module } from '@nestjs/common';

import { SessionRedis } from './session';

/**
 * Provides the session Redis client to DI so {@link configureApp} can build the
 * session store and Nest can quit the client on shutdown.
 */
@Global()
@Module({
  providers: [SessionRedis],
  exports: [SessionRedis],
})
export class SessionModule {}
