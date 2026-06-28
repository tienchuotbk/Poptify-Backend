import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS cho frontend gọi backend bằng session token (Authorization bearer).
 * Origin lấy từ env `CORS_ORIGINS` (comma list). Rỗng → `origin: false` (chặn).
 */
export function buildCorsOptions(config: ConfigService): CorsOptions {
  const origins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin: origins.length > 0 ? origins : false,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };
}
