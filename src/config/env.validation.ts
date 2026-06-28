import * as Joi from 'joi';

/**
 * Env validation schema (fail-fast). Thiếu biến `required` → app throw lúc bootstrap.
 * Tham chiếu spec.md §5 (env validation fail-fast) + decision-log Shopify.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // Shopify
  SHOPIFY_API_KEY: Joi.string().required(),
  SHOPIFY_API_SECRET: Joi.string().required(),
  SHOPIFY_SCOPES: Joi.string().required(),
  SHOPIFY_API_VERSION: Joi.string().default('2026-04'),
  APP_URL: Joi.string().uri().required(),

  // CORS — origin của frontend (Q9), comma-separated. Rỗng = chặn cross-origin.
  CORS_ORIGINS: Joi.string().allow('').default(''),

  // Database (MySQL)
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),

  // Token encryption (access token at-rest) — tách khỏi app secret
  TOKEN_ENCRYPTION_KEY: Joi.string().min(32).required(),
});
