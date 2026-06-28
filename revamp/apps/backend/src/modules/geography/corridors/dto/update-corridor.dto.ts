import { PartialType } from '@nestjs/swagger';

import { CreateCorridorDto } from './create-corridor.dto';

/** Update a corridor — all fields optional; `pathGeojson` re-validated when present. */
export class UpdateCorridorDto extends PartialType(CreateCorridorDto) {}
