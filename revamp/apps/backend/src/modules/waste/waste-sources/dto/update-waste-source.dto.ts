import { PartialType } from '@nestjs/swagger';

import { CreateWasteSourceDto } from './create-waste-source.dto';

export class UpdateWasteSourceDto extends PartialType(CreateWasteSourceDto) {}
