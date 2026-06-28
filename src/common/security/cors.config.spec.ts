import { ConfigService } from '@nestjs/config';
import { buildCorsOptions } from './cors.config';

function configStub(value?: string): ConfigService {
  return { get: () => value } as unknown as ConfigService;
}

describe('buildCorsOptions (task 4.1)', () => {
  it('parses a comma-separated origin list', () => {
    expect(
      buildCorsOptions(configStub('https://a.com, https://b.com')).origin,
    ).toEqual(['https://a.com', 'https://b.com']);
  });

  it('returns origin:false when no origins configured', () => {
    expect(buildCorsOptions(configStub('')).origin).toBe(false);
  });

  it('allows Authorization header and credentials', () => {
    const options = buildCorsOptions(configStub('https://a.com'));
    expect(options.allowedHeaders).toContain('Authorization');
    expect(options.credentials).toBe(true);
  });
});
