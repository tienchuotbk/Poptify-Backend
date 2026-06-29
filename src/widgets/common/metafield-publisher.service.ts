import { Injectable, Logger } from '@nestjs/common';
import { Session } from '@shopify/shopify-api';
import { OfflineTokenService } from '../../shopify/auth/offline-token.service';
import { AdminGraphqlService } from '../../shopify/graphql/admin-graphql.service';

/** Lấy GID của shop để làm `ownerId` cho metafield (owner = Shop). */
const SHOP_GID_QUERY = `query ShopGid {
  shop {
    id
  }
}`;

/** Probe scope thật của token (chẩn đoán 403). */
const ACCESS_SCOPES_QUERY = `query AccessScopes {
  currentAppInstallation {
    accessScopes {
      handle
    }
  }
}`;

interface AccessScopesResponse {
  currentAppInstallation: { accessScopes: { handle: string }[] };
}

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

    try {
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
    } catch (error) {
      // Chẩn đoán riêng cho 403 (không nuốt lỗi gốc).
      await this.diagnose403(session, key, error).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Khi 403 Forbidden: probe scope thật của token + log đầy đủ checklist nguyên nhân.
   * No-op nếu lỗi không phải 403 (vd userError / 5xx) để tránh nhiễu log.
   */
  private async diagnose403(
    session: Session,
    key: string,
    error: unknown,
  ): Promise<void> {
    if (this.extractStatus(error) !== 403) return;

    const lines: string[] = [
      `[403 DIAGNOSE] metafieldsSet key="${key}" shop=${session.shop} bị 403 Forbidden.`,
      `  • Scope token đã lưu: ${session.scope || '(none)'}`,
      `  • Token expires: ${session.expires ? new Date(session.expires).toISOString() : '(non-expiring / none)'}`,
    ];

    // Probe: token có còn gọi Admin API được không? → khoanh vùng nguyên nhân.
    try {
      const data = await this.admin.query<AccessScopesResponse>(
        session,
        ACCESS_SCOPES_QUERY,
      );
      const live = data.currentAppInstallation.accessScopes
        .map((s) => s.handle)
        .sort();
      lines.push(
        `  • Scope LIVE (currentAppInstallation): ${live.join(', ') || '(empty)'}`,
      );
      lines.push(
        live.includes('write_products')
          ? `    → Token gọi Admin API OK & có write_products. 403 nhiều khả năng do quyền GHI shop metafield / definition chưa deploy.`
          : `    → Token gọi Admin API OK nhưng THIẾU write_products. Đây gần như chắc là nguyên nhân: grant scope chưa đủ → cài lại app sau khi deploy scope.`,
      );
    } catch (probeErr) {
      const probeStatus = this.extractStatus(probeErr);
      lines.push(
        probeStatus === 403
          ? `  • currentAppInstallation CŨNG 403 → token bị từ chối toàn cục (token cũ/sai, app access bị thu hồi, hoặc Protected Customer Data chưa duyệt).`
          : `  • Probe accessScopes lỗi khác (${probeStatus ?? '?'}): ${probeErr instanceof Error ? probeErr.message : String(probeErr)}`,
      );
    }

    lines.push(
      '  Các nguyên nhân khả dĩ của 403 (kiểm tra theo thứ tự):',
      '    1) Offline token CŨ cấp trước khi đổi scope → gỡ + cài lại app để re-grant.',
      '    2) Grant thiếu scope ghi shop metafield (xem "Scope LIVE" ở trên).',
      '    3) read_orders = Protected Customer Data chưa cấu hình/duyệt ở Partner Dashboard → chặn API.',
      '    4) Metafield definition $app (shop.metafields.app.*) chưa deploy qua shopify.app.toml.',
      '    5) ownerId sai owner type (đang dùng Shop GID — đúng cho shop metafield).',
      '    6) Token thuộc app khác / client_id mismatch (SHOPIFY_API_KEY/SECRET sai).',
      '    7) App chưa thực sự được cài trên shop này.',
    );

    this.logger.error(lines.join('\n'));
  }

  /** Trích HTTP status từ lỗi của Shopify GraphQL client (nhiều shape khác nhau). */
  private extractStatus(error: unknown): number | undefined {
    if (typeof error === 'object' && error !== null) {
      const e = error as Record<string, unknown>;
      const response = e.response as Record<string, unknown> | undefined;
      const candidate =
        (response?.code as number | undefined) ??
        (response?.statusCode as number | undefined) ??
        (e.code as number | undefined) ??
        (e.statusCode as number | undefined) ??
        (e.networkStatusCode as number | undefined);
      if (typeof candidate === 'number') return candidate;
    }
    const msg = error instanceof Error ? error.message : String(error);
    const match = msg.match(/\b(4\d\d|5\d\d)\b/);
    return match ? Number(match[1]) : undefined;
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
