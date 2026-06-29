import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '@shopify/shopify-api';
import { Repository } from 'typeorm';
import { ShopEntity } from '../../database/entities/shop.entity';
import { OfflineTokenService } from './offline-token.service';

/**
 * Token Exchange (task 2.4, D5): đổi App Bridge session token → EXPIRING offline
 * access token (delegate cho OfflineTokenService, lưu token + refresh_token mã hóa
 * at-rest) + upsert Shop.installed.
 */
@Injectable()
export class TokenExchangeService {
  constructor(
    private readonly offlineToken: OfflineTokenService,
    @InjectRepository(ShopEntity)
    private readonly shops: Repository<ShopEntity>,
  ) {}

  async exchangeOffline(shop: string, sessionToken: string): Promise<Session> {
    const session = await this.offlineToken.exchangeOffline(shop, sessionToken);
    await this.markShopInstalled(session.shop);
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
