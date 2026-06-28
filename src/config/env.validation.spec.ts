import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';

const REQUIRED_KEYS = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'SHOPIFY_SCOPES',
  'APP_URL',
  'DB_HOST',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'TOKEN_ENCRYPTION_KEY',
];

const validEnv: Record<string, string> = {
  SHOPIFY_API_KEY: 'test-api-key',
  SHOPIFY_API_SECRET: 'test-api-secret',
  SHOPIFY_SCOPES: 'read_products',
  APP_URL: 'https://example.myshopify.test',
  DB_HOST: 'localhost',
  DB_USERNAME: 'root',
  DB_PASSWORD: '',
  DB_NAME: 'poptify',
  TOKEN_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
};

describe('env validation (fail-fast)', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  function buildModule() {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          validationSchema: envValidationSchema,
          validationOptions: { abortEarly: false },
        }),
      ],
    }).compile();
  }

  it('throws when required env is missing', async () => {
    for (const key of REQUIRED_KEYS) {
      delete process.env[key];
    }
    await expect(buildModule()).rejects.toThrow();
  });

  it('compiles when all required env is present', async () => {
    Object.assign(process.env, validEnv);
    const moduleRef = await buildModule();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
