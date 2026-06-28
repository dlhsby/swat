import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

/** Pick one of the trip's route corridors for a single day. */
export class SetTripCorridorDto {
  /** A corridor id selects it; `''` or omitted clears back to the route default. */
  @IsOptional()
  // `''` is the explicit "clear" signal — skip the UUID check for it.
  @ValidateIf((o: SetTripCorridorDto) => o.corridorId !== '')
  @IsUUID(undefined, { message: 'ID koridor harus berupa UUID' })
  corridorId?: string;
}
