import { bullRedisConnection } from '../bull-connection';

describe('bullRedisConnection', () => {
  it('parses a plain redis URL with defaults', () => {
    expect(bullRedisConnection('redis://localhost:6379')).toEqual({
      host: 'localhost',
      port: 6379,
      username: undefined,
      password: undefined,
      db: 0,
      maxRetriesPerRequest: null,
    });
  });

  it('parses credentials, db index, and rediss TLS', () => {
    const conn = bullRedisConnection('rediss://user:p%40ss@cache.example:6380/3');
    expect(conn).toMatchObject({
      host: 'cache.example',
      port: 6380,
      username: 'user',
      password: 'p@ss', // URL-decoded
      db: 3,
      maxRetriesPerRequest: null,
      tls: {},
    });
  });

  it('defaults the port to 6379 when absent', () => {
    expect(bullRedisConnection('redis://host').port).toBe(6379);
  });
});
