import { BadRequestException } from '@nestjs/common';

import { parseBigIntId } from './parse-bigint';

describe('parseBigIntId', () => {
  it('parses a numeric string to a bigint', () => {
    expect(parseBigIntId('42')).toBe(42n);
  });

  it('throws BadRequest with the default message on a bad value', () => {
    expect(() => parseBigIntId('abc')).toThrow(BadRequestException);
  });

  it('uses the supplied message', () => {
    try {
      parseBigIntId('x', 'ID trip tidak valid.');
      fail('expected to throw');
    } catch (err) {
      expect((err as BadRequestException).message).toBe('ID trip tidak valid.');
    }
  });
});
