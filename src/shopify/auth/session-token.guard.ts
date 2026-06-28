import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SHOPIFY_API, ShopifyApi } from '../shopify.constants';

type SessionTokenPayload = Awaited<
  ReturnType<ShopifyApi['session']['decodeSessionToken']>
>;

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  shopifySession?: SessionTokenPayload;
}

/**
 * Bảo vệ route bằng App Bridge session token (task 2.3).
 * `decodeSessionToken` của @shopify/shopify-api verify HS256 bằng app secret,
 * check `aud`=API key, `exp`/`nbf`, và reject token sai/`alg:none`.
 */
@Injectable()
export class SessionTokenGuard implements CanActivate {
  constructor(@Inject(SHOPIFY_API) private readonly shopify: ShopifyApi) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers['authorization'];
    const authorization = Array.isArray(header) ? header[0] : header;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing session token');
    }

    const token = authorization.slice('Bearer '.length).trim();

    try {
      request.shopifySession =
        await this.shopify.session.decodeSessionToken(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid session token');
    }
  }
}
