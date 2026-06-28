import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopEntity } from '../../database/entities/shop.entity';
import { TypeormSessionStorage } from '../../shopify/session/typeorm-session.storage';

/**
 * Xử lý webhook `app/uninstalled` (task 3.3): đánh dấu Shop uninstalled +
 * xóa toàn bộ session của shop (token không còn hợp lệ sau khi gỡ app).
 */
@Injectable()
export class AppUninstalledHandler {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shops: Repository<ShopEntity>,
    private readonly sessions: TypeormSessionStorage,
  ) {}

  async handle(shopDomain: string): Promise<void> {
    const shop = await this.shops.findOneBy({ shop: shopDomain });
    if (shop) {
      shop.installed = false;
      shop.uninstalledAt = new Date();
      await this.shops.save(shop);
    }

    const existing = await this.sessions.findSessionsByShop(shopDomain);
    if (existing.length > 0) {
      await this.sessions.deleteSessions(existing.map((s) => s.id));
    }
  }
}
