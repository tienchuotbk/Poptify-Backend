import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '@shopify/shopify-api';
import { Repository } from 'typeorm';
import { ShopifySessionEntity } from '../../database/entities/shopify-session.entity';

/**
 * SessionStorage backed bởi TypeORM (task 2.2). Map giữa `Session` của
 * `@shopify/shopify-api` và `ShopifySessionEntity`. accessToken được mã hóa
 * at-rest bởi transformer trên entity (task 2.5).
 */
@Injectable()
export class TypeormSessionStorage {
  constructor(
    @InjectRepository(ShopifySessionEntity)
    private readonly repo: Repository<ShopifySessionEntity>,
  ) {}

  async storeSession(session: Session): Promise<boolean> {
    await this.repo.save(this.toEntity(session));
    return true;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toSession(entity) : undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    await this.repo.delete({ id });
    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    if (ids.length > 0) {
      await this.repo.delete(ids);
    }
    return true;
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const entities = await this.repo.findBy({ shop });
    return entities.map((entity) => this.toSession(entity));
  }

  /**
   * Truy cập entity thô (gồm refreshToken/refreshTokenExpires — các field KHÔNG có
   * trong `Session` của @shopify/shopify-api). Dùng bởi OfflineTokenService cho
   * expiring offline token. Transformer tự giải mã accessToken/refreshToken khi đọc.
   */
  async loadEntity(id: string): Promise<ShopifySessionEntity | null> {
    return (await this.repo.findOneBy({ id })) ?? null;
  }

  async saveEntity(entity: ShopifySessionEntity): Promise<void> {
    await this.repo.save(entity);
  }

  private toEntity(session: Session): ShopifySessionEntity {
    const entity = new ShopifySessionEntity();
    entity.id = session.id;
    entity.shop = session.shop;
    entity.state = session.state;
    entity.isOnline = session.isOnline;
    entity.scope = session.scope ?? null;
    entity.expires = session.expires ?? null;
    entity.accessToken = session.accessToken ?? null;
    entity.onlineAccessInfo = session.onlineAccessInfo
      ? JSON.stringify(session.onlineAccessInfo)
      : null;
    return entity;
  }

  private toSession(entity: ShopifySessionEntity): Session {
    return new Session({
      id: entity.id,
      shop: entity.shop,
      state: entity.state,
      isOnline: entity.isOnline,
      scope: entity.scope ?? undefined,
      expires: entity.expires ? new Date(entity.expires) : undefined,
      accessToken: entity.accessToken ?? undefined,
      onlineAccessInfo: entity.onlineAccessInfo
        ? JSON.parse(entity.onlineAccessInfo)
        : undefined,
    });
  }
}
