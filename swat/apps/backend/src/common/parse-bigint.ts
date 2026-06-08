import { BadRequestException } from '@nestjs/common';

/** Parse a numeric path-param string to a `bigint`, 400ing on a bad value. */
export function parseBigIntId(id: string, message = 'ID tidak valid.'): bigint {
  try {
    return BigInt(id);
  } catch {
    throw new BadRequestException(message);
  }
}
