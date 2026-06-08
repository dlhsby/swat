import { Module } from '@nestjs/common';

import { DriversController } from './drivers/drivers.controller';
import { DriversRepository } from './drivers/drivers.repository';
import { DriversService } from './drivers/drivers.service';
import { DriverLicensesController } from './drivers/licenses/driver-licenses.controller';
import { DriverLicensesService } from './drivers/licenses/driver-licenses.service';
import { LicenseClassesController } from './license-classes/license-classes.controller';

/**
 * Personnel master data (Epic 1.3): drivers, their licenses, and the read-only
 * license-class lookup.
 */
@Module({
  controllers: [LicenseClassesController, DriversController, DriverLicensesController],
  providers: [DriversService, DriversRepository, DriverLicensesService],
  exports: [DriversService],
})
export class PersonnelModule {}
