// Jest setupFiles — chạy TRƯỚC khi import module test.
// Cần thiết vì: (1) ConfigModule.forRoot validate eager lúc import AppModule;
// (2) token-encryption transformer đọc TOKEN_ENCRYPTION_KEY lúc save/load entity.
const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3000',
  SHOPIFY_API_KEY: 'test-api-key',
  SHOPIFY_API_SECRET: 'test-api-secret',
  SHOPIFY_SCOPES: 'read_products',
  SHOPIFY_API_VERSION: '2026-04',
  APP_URL: 'https://example.myshopify.test',
  DB_HOST: 'localhost',
  DB_USERNAME: 'root',
  DB_PASSWORD: '',
  DB_NAME: 'poptify',
  TOKEN_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
};

Object.assign(process.env, testEnv);
