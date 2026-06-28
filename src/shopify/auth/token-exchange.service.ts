import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestedTokenType, Session } from '@shopify/shopify-api';
import { Repository } from 'typeorm';
import { ShopEntity } from '../../database/entities/shop.entity';
import { SHOPIFY_API, ShopifyApi } from '../shopify.constants';
import { TypeormSessionStorage } from '../session/typeorm-session.storage';

/**
 * Token Exchange (task 2.4, D5): đổi App Bridge session token → OFFLINE access
 * token, lưu qua SessionStorage (token mã hóa at-rest) + upsert Shop.installed.
 */
@Injectable()
export class TokenExchangeService {
  constructor(
    @Inject(SHOPIFY_API) private readonly shopify: ShopifyApi,
    private readonly sessions: TypeormSessionStorage,
    @InjectRepository(ShopEntity)
    private readonly shops: Repository<ShopEntity>,
  ) {}

  async exchangeOffline(shop: string, sessionToken: string): Promise<Session> {
    // sanitizeShop(throwOnInvalid) chặn open-redirect / host spoofing (spec.md §5).
    const sanitizedShop = this.shopify.utils.sanitizeShop(shop, true) as string;

    const { session } = await this.shopify.auth.tokenExchange({
      shop: sanitizedShop,
      sessionToken,
      requestedTokenType: RequestedTokenType.OfflineAccessToken,
    });

    await this.sessions.storeSession(session);
    await this.markShopInstalled(sanitizedShop);
    return session;
  }

  private async markShopInstalled(shop: string): Promise<void> {
    const existing = await this.shops.findOneBy({ shop });
    const entity = existing ?? this.shops.create({ shop });
    entity.installed = true;
    entity.installedAt = new Date();
    entity.uninstalledAt = null;
    await this.shops.save(entity);
  }
}
