import { Injectable, Logger } from '@nestjs/common';
import { OfflineTokenService } from '../../shopify/auth/offline-token.service';
import { AdminGraphqlService } from '../../shopify/graphql/admin-graphql.service';

/** Lấy GID của shop để làm `ownerId` cho metafield (owner = Shop). */
const SHOP_GID_QUERY = `query ShopGid {
  shop {
    id
  }
}`;

/**
 * Ghi app-owned shop metafield. KHÔNG truyền `namespace` → mặc định `$app`
 * (gắn với metafield definition khai báo trong shopify.app.toml — task 6.2).
 */
const SET_METAFIELD_MUTATION = `mutation SetWidgetMetafield($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }
}`;

interface ShopGidResponse {
  shop: { id: string };
}

interface MetafieldsSetResponse {
  metafieldsSet: {
    metafields: { id: string; namespace: string; key: string }[] | null;
    userErrors: {
      field: string[] | null;
      message: string;
      code: string | null;
    }[];
  };
}

/**
 * Publish config widget lên shop metafield (task 6.5 / D6-D8).
 * Theme app extension đọc metafield qua Liquid → KHÔNG cần endpoint public.
 *
 * Dùng OFFLINE session (background, không gắn user) qua `OfflineTokenService.getValidSession`
 * — tự refresh expiring token khi sắp/đã hết hạn. Nếu không có session hợp lệ (chưa cài /
 * đã gỡ / refresh token hết hạn) → degrade graceful (log + `{published:false}`), KHÔNG throw
 * để không vỡ luồng CRUD.
 */
@Injectable()
export class MetafieldPublisherService {
  private readonly logger = new Logger(MetafieldPublisherService.name);

  constructor(
    private readonly offlineToken: OfflineTokenService,
    private readonly admin: AdminGraphqlService,
  ) {}

  /**
   * @param shop  shop domain (vd `acme.myshopify.com`) — đã verify từ session.
   * @param key   key metafield theo module (`settings`/`popups`/`bars`/`sliders`).
   * @param value object JSON sẽ serialize vào metafield type `json`.
   */
  async publish(
    shop: string,
    key: string,
    value: unknown,
  ): Promise<{ published: boolean }> {
    // getValidSession tự refresh expiring offline token khi sắp/đã hết hạn.
    const session = await this.offlineToken.getValidSession(shop);
    if (!session) {
      this.logger.warn(
        `Bỏ qua publish metafield "${key}": không có offline session hợp lệ cho ${shop}`,
      );
      return { published: false };
    }

    const shopGid = await this.getShopGid(session);

    const data = await this.admin.query<MetafieldsSetResponse>(
      session,
      SET_METAFIELD_MUTATION,
      {
        metafields: [
          {
            ownerId: shopGid,
            key,
            type: 'json',
            value: JSON.stringify(value),
          },
        ],
      },
    );

    if (!data?.metafieldsSet) {
      throw new Error(
        `metafieldsSet không trả về kết quả (key=${key}) — response thiếu metafieldsSet`,
      );
    }

    const errors = data.metafieldsSet.userErrors;
    if (errors && errors.length > 0) {
      throw new Error(
        `metafieldsSet thất bại (key=${key}): ${errors
          .map((e) => e.message)
          .join('; ')}`,
      );
    }
    return { published: true };
  }

  private async getShopGid(
    session: Parameters<AdminGraphqlService['query']>[0],
  ): Promise<string> {
    const data = await this.admin.query<ShopGidResponse>(
      session,
      SHOP_GID_QUERY,
    );
    return data.shop.id;
  }
}
