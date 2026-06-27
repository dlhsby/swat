import { IsOptional, IsString } from 'class-validator';

/** Pick one of the trip's route corridors for a single day. */
export class SetTripCorridorDto {
  /** A corridor id selects it; `''` or omitted clears back to the route default. */
  @IsOptional()
  @IsString()
  corridorId?: string;
}
