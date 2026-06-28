import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { type AppConfigService } from '../../../config/config.service';
import { StorageService } from '../storage.service';

// Mock the presigner so no network/credentials are needed.
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const mockedGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

function makeConfig(): AppConfigService {
  return {
    storage: {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'swat-photos',
      accessKey: 'swat',
      secretKey: 'secret',
      forcePathStyle: true,
    },
  } as AppConfigService;
}

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService(makeConfig());
  });

  it('generates a presigned PUT url', async () => {
    mockedGetSignedUrl.mockResolvedValue('http://signed-put');
    const url = await service.getPresignedPutUrl('trip/a.jpg', 'image/jpeg', 600);
    expect(url).toBe('http://signed-put');
    expect(mockedGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 600,
    });
  });

  it('generates a presigned GET url with the default expiry', async () => {
    mockedGetSignedUrl.mockResolvedValue('http://signed-get');
    const url = await service.getPresignedGetUrl('trip/a.jpg');
    expect(url).toBe('http://signed-get');
    expect(mockedGetSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 900,
    });
  });

  it('uploads an object via the S3 client', async () => {
    const send = jest.spyOn(
      (service as unknown as { client: { send: (cmd: unknown) => Promise<unknown> } }).client,
      'send',
    );
    send.mockResolvedValue({} as never);
    await service.uploadObject('reports/r.pdf', Buffer.from('x'), 'application/pdf');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('deletes an object via the S3 client', async () => {
    const send = jest.spyOn(
      (service as unknown as { client: { send: (cmd: unknown) => Promise<unknown> } }).client,
      'send',
    );
    send.mockResolvedValue({} as never);
    await service.deleteObject('trip/a.jpg');
    expect(send).toHaveBeenCalledTimes(1);
  });
});
