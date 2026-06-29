import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Session } from '@shopify/shopify-api';
import { ShopifySessionEntity } from '../../database/entities/shopify-session.entity';
import { TypeormSessionStorage } from '../session/typeorm-session.storage';
import { SHOPIFY_API, ShopifyApi } from '../shopify.constants';

interface TokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number; // giây tới khi access token hết hạn (expiring: 3600)
  refresh_token?: string;
  refresh_token_expires_in?: number; // giây tới khi refresh token hết hạn (~90 ngày)
}

// Refresh sớm khi access token còn dưới ngưỡng này (tránh hết hạn giữa request).
const EXPIRY_BUFFER_MS = 2 * 60 * 1000;

/**
 * Quản lý EXPIRING offline access token (Shopify 12/2025).
 * - `exchangeOffline`: đổi App Bridge session token → expiring offline token (`expiring=1`),
 *   lưu kèm refresh_token (mã hóa at-rest).
 * - `getValidSession`: dùng cho background job (publish metafield) — tự refresh khi
 *   access token sắp/đã hết hạn rồi trả Session có token hợp lệ.
 *
 * Library @shopify/shopify-api@13 chưa hỗ trợ tham số `expiring`, nên gọi thẳng endpoint
 * OAuth `https://{shop}/admin/oauth/access_token` (form-urlencoded) theo docs.
 */
@Injectable()
export class OfflineTokenService {
  private readonly logger = new Logger(OfflineTokenService.name);

  constructor(
    @Inject(SHOPIFY_API) private readonly shopify: ShopifyApi,
    private readonly config: ConfigService,
    private readonly sessions: TypeormSessionStorage,
  ) {}

  /** Token exchange → expiring offline token, lưu lại. Trả Session dùng được ngay. */
  async exchangeOffline(shop: string, sessionToken: string): Promise<Session> {
    const sanitizedShop = this.sanitize(shop);
    const data = await this.post(
      sanitizedShop,
      this.baseParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: sessionToken,
        subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
        requested_token_type:
          'urn:shopify:params:oauth:token-type:offline-access-token',
        expiring: '1',
      }),
    );
    this.logger.log(
      `Token exchange (expiring) OK cho ${sanitizedShop} — scope: ${data.scope ?? '(none)'}`,
    );
    return this.persist(sanitizedShop, data);
  }

  /**
   * Load offline session; refresh nếu access token sắp/đã hết hạn. Trả null khi:
   * không có session, không có refresh_token (token non-expiring cũ đã hết hạn),
   * hoặc refresh token đã hết hạn (>90 ngày) → caller degrade graceful.
   */
  async getValidSession(shop: string): Promise<Session | null> {
    const sanitizedShop = this.sanitize(shop);
    const id = this.shopify.session.getOfflineId(sanitizedShop);
    const entity = await this.sessions.loadEntity(id);
    if (!entity?.accessToken) {
      this.logger.warn(`Không có offline session cho ${sanitizedShop}`);
      return null;
    }

    const expiresAt = entity.expires ? new Date(entity.expires).getTime() : null;
    const expiringSoon =
      expiresAt !== null && expiresAt - Date.now() < EXPIRY_BUFFER_MS;

    // Token non-expiring cũ (expires=null) → dùng nguyên.
    if (!expiringSoon) {
      return this.toSession(entity);
    }

    return this.refresh(sanitizedShop, entity);
  }

  private async refresh(
    shop: string,
    entity: ShopifySessionEntity,
  ): Promise<Session | null> {
    if (!entity.refreshToken) {
      this.logger.warn(
        `Offline token ${shop} hết hạn nhưng thiếu refresh_token — cần merchant mở lại app.`,
      );
      return null;
    }
    if (
      entity.refreshTokenExpires &&
      new Date(entity.refreshTokenExpires).getTime() <= Date.now()
    ) {
      this.logger.warn(
        `Refresh token ${shop} đã hết hạn (>90 ngày) — cần merchant mở lại app.`,
      );
      return null;
    }

    const data = await this.post(
      shop,
      this.baseParams({
        grant_type: 'refresh_token',
        refresh_token: entity.refreshToken,
      }),
    );
    this.logger.log(`Refresh offline token OK cho ${shop}`);
    return this.persist(shop, data);
  }

  private baseParams(extra: Record<string, string>): URLSearchParams {
    return new URLSearchParams({
      client_id: this.config.getOrThrow<string>('SHOPIFY_API_KEY'),
      client_secret: this.config.getOrThrow<string>('SHOPIFY_API_SECRET'),
      ...extra,
    });
  }

  private async post(
    shop: string,
    body: URLSearchParams,
  ): Promise<TokenResponse> {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `OAuth token endpoint trả ${res.status} cho ${shop}: ${text}`,
      );
    }
    return (await res.json()) as TokenResponse;
  }

  private async persist(shop: string, data: TokenResponse): Promise<Session> {
    const id = this.shopify.session.getOfflineId(shop);
    const entity = (await this.sessions.loadEntity(id)) ?? new ShopifySessionEntity();
    entity.id = id;
    entity.shop = shop;
    entity.state = entity.state ?? '';
    entity.isOnline = false;
    entity.scope = data.scope ?? entity.scope ?? null;
    entity.accessToken = data.access_token;
    entity.expires = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;
    // Refresh trả refresh_token mới mỗi lần; giữ giá trị cũ nếu response thiếu.
    entity.refreshToken = data.refresh_token ?? entity.refreshToken ?? null;
    entity.refreshTokenExpires = data.refresh_token_expires_in
      ? new Date(Date.now() + data.refresh_token_expires_in * 1000)
      : (entity.refreshTokenExpires ?? null);
    await this.sessions.saveEntity(entity);
    return this.toSession(entity);
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
    });
  }

  private sanitize(shop: string): string {
    return this.shopify.utils.sanitizeShop(shop, true) as string;
  }
}
