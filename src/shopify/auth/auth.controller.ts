import { Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentShop } from '../../widgets/common/current-shop.decorator';
import { SessionTokenGuard } from './session-token.guard';
import { TokenExchangeService } from './token-exchange.service';

/**
 * Auth / Install (task 13.1). Frontend embedded (App Bridge) lúc load gửi session
 * token tới đây; backend đổi sang **offline** access token (Token Exchange, D5) và
 * lưu — đây là điều kiện để `MetafieldPublisherService` publish được (cần offline
 * session). `SessionTokenGuard` verify token; shop lấy từ token đã verify (`dest`).
 */
@Controller('api/auth')
@UseGuards(SessionTokenGuard)
export class AuthController {
  constructor(private readonly tokenExchange: TokenExchangeService) {}

  @Post('token-exchange')
  @HttpCode(200)
  async exchange(
    @CurrentShop() shop: string,
    @Headers('authorization') authorization?: string,
  ): Promise<{ shop: string; installed: boolean }> {
    // Raw session token (guard đã verify); tách 'Bearer ' để đưa vào Token Exchange.
    const token = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    await this.tokenExchange.exchangeOffline(shop, token);
    return { shop, installed: true };
  }
}
