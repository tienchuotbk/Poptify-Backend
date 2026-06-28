import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const SHOP_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

/**
 * CSP `frame-ancestors` cho embedded app (task 4.1, spec.md §5).
 * App phải nhúng được trong Admin iframe theo từng shop; KHÔNG set
 * `X-Frame-Options: DENY` (sẽ vỡ embed).
 */
@Injectable()
export class ShopifyCspMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const shop =
      typeof req.query.shop === 'string' ? req.query.shop : undefined;
    const frameAncestors =
      shop && SHOP_REGEX.test(shop)
        ? `https://${shop} https://admin.shopify.com`
        : 'https://admin.shopify.com https://*.myshopify.com';

    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors ${frameAncestors};`,
    );
    res.removeHeader('X-Frame-Options');
    next();
  }
}
