import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verifyWebhookHmac } from './webhook-hmac.util';

/**
 * Verify HMAC webhook TRƯỚC khi xử lý (task 3.1/3.2, spec.md §5).
 * Dùng `req.rawBody` (bật bởi `rawBody: true` ở main.ts), KHÔNG dùng body đã parse.
 * HMAC sai / thiếu raw body → 401.
 */
@Injectable()
export class WebhookHmacGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const header = request.headers['x-shopify-hmac-sha256'];
    const hmac = Array.isArray(header) ? header[0] : header;
    const secret = this.config.getOrThrow<string>('SHOPIFY_API_SECRET');

    if (!request.rawBody || !verifyWebhookHmac(request.rawBody, hmac, secret)) {
      throw new UnauthorizedException('Invalid webhook HMAC');
    }
    return true;
  }
}
