import {
  type ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { HttpExceptionFilter } from '../http-exception.filter';

function mockHost(): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: '5.22.0',
  });
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('maps an HttpException to its status and code', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('Tidak ada.'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0]).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Tidak ada.' },
    });
  });

  it('groups array validation messages into field details (422)', () => {
    const { host, status, json } = mockHost();
    filter.catch(
      new UnprocessableEntityException({
        message: ['name must be longer', 'name is required'],
        error: 'Validasi gagal.',
      }),
      host,
    );
    expect(status).toHaveBeenCalledWith(422);
    const payload = json.mock.calls[0][0];
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details.name).toEqual(['name must be longer', 'name is required']);
  });

  it('passes through a string-body HttpException message', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException('Pesan langsung.'), host);
    expect(json.mock.calls[0][0].error.message).toBe('Pesan langsung.');
  });

  it('maps a Prisma unique violation (P2002) to 409', () => {
    const { host, status, json } = mockHost();
    filter.catch(knownError('P2002'), host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0].error.code).toBe('CONFLICT');
  });

  it('maps a Prisma not-found (P2025) to 404', () => {
    const { host, status, json } = mockHost();
    filter.catch(knownError('P2025'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error.code).toBe('NOT_FOUND');
  });

  it('maps a Prisma FK violation (P2003) to 409', () => {
    const { host, status, json } = mockHost();
    filter.catch(knownError('P2003'), host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0].error.code).toBe('CONFLICT');
  });

  it('returns a generic 500 for an unknown error without leaking detail', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('secret stack detail'), host);
    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0];
    expect(payload.error.code).toBe('INTERNAL_ERROR');
    expect(payload.error.message).toBe('Terjadi kesalahan pada server.');
    expect(JSON.stringify(payload)).not.toContain('secret stack detail');
  });

  it('returns a generic message for a 5xx HttpException', () => {
    const { host, status, json } = mockHost();
    filter.catch(new InternalServerErrorException('internal detail'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0][0].error.message).toBe('Terjadi kesalahan pada server.');
  });
});
