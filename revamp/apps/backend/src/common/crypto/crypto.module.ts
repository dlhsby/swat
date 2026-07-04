import { Global, Module } from '@nestjs/common';

import { EncryptionService } from './encryption.service';

/** Global so any module can inject {@link EncryptionService} without re-importing. */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CryptoModule {}
