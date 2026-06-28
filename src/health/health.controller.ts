import {
  Controller,
  Get,
  HttpCode,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Health endpoints (task 4.2):
 * - `/healthz` liveness (không chạm DB, không leak env).
 * - `/readyz` readiness (ping DB) → 503 khi DB down.
 */
@Controller()
export class HealthController {
  private readonly logger = new Logger('Health');

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('healthz')
  @HttpCode(200)
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('readyz')
  async readiness(): Promise<{ status: string; db: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', db: 'up' };
    } catch {
      this.logger.error('Readiness check failed: database unreachable');
      throw new ServiceUnavailableException({ status: 'unready', db: 'down' });
    }
  }
}
