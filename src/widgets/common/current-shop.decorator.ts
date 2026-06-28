import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Shape tối thiểu của request sau khi `SessionTokenGuard` chạy: payload session
 * token đã verify nằm ở `shopifySession`, claim `dest` = URL shop (vd
 * `https://acme.myshopify.com`).
 */
interface RequestWithShopifySession {
  shopifySession?: { dest?: unknown };
}

/**
 * Trích **shop domain** từ session token đã verify (claim `dest`).
 * Nguồn shop TIN CẬY DUY NHẤT cho Admin (spec.md F5: không bao giờ nhận shop từ
 * client body → chống IDOR/cross-shop). Tách thành factory thuần để unit test.
 */
export function resolveShopFromRequest(req: RequestWithShopifySession): string {
  const dest = req.shopifySession?.dest;
  if (typeof dest !== 'string' || dest.length === 0) {
    throw new UnauthorizedException('Missing shop context');
  }

  // `dest` là URL (`https://{shop}.myshopify.com`); lấy hostname.
  let host: string;
  try {
    host = new URL(dest).hostname;
  } catch {
    // Fallback: `dest` đôi khi là bare domain (không scheme).
    host = dest.replace(/^https?:\/\//, '').split('/')[0];
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(host)) {
    throw new UnauthorizedException('Invalid shop context');
  }
  return host;
}

/** `@CurrentShop()` — inject shop domain đã verify vào handler param. */
export const CurrentShop = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<RequestWithShopifySession>();
    return resolveShopFromRequest(req);
  },
);
