# Poptify Backend 

Backend cho Shopify **embedded** app "Poptify: Popup & Sales Slider".
Stack: **NestJS + TypeORM + MySQL**, Admin API `2026-04`, auth qua **Token Exchange** (offline token).

> Nguồn sự thật: `spec.md` (product contract) + `Plans.md` (task ledger).

## Yêu cầu

- Node.js >= 20
- MySQL 8 (prod/CI). Test chạy bằng **sqlite in-memory (sqljs)** — không cần MySQL.

## Cài đặt

```bash
npm ci
cp .env.example .env   # rồi điền giá trị thật
```

Biến môi trường bắt buộc (xem `.env.example`): `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`,
`SHOPIFY_SCOPES`, `APP_URL`, `DB_HOST/DB_USERNAME/DB_PASSWORD/DB_NAME`,
`TOKEN_ENCRYPTION_KEY` (>= 32 ký tự). App **fail-fast** nếu thiếu.

## Chạy

```bash
npm run start:dev     # watch mode
npm run start:prod    # sau khi npm run build
```

## Test & chất lượng

```bash
npm test          # unit (sqljs in-memory)
npm run test:e2e  # e2e (sqljs in-memory)
npm run lint
npm run build
```

## Database & migration (MySQL)

```bash
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
```

`synchronize` tắt — schema thay đổi qua migration. Baseline (3 entity bootstrap) +
4 migration feature (`popups`, `app_settings`, `announcement_bars`, `product_sliders`)
chạy tự động ở CI (MySQL service container: run → revert → run).

## Cấu trúc chính

| Đường dẫn | Vai trò |
|---|---|
| `src/config/env.validation.ts` | Joi schema env (fail-fast) |
| `src/database/` | TypeORM datasource, entities, migrations, test datasource (sqljs) |
| `src/shopify/` | `@shopify/shopify-api` instance, SessionStorage, JWT guard, Token Exchange, GraphQL helper, mã hóa token |
| `src/webhook/` | HMAC verify (timing-safe), idempotency, `app/uninstalled`, controller |
| `src/health/` | `/healthz` (liveness), `/readyz` (DB ping) |
| `src/common/` | CORS, CSP middleware, redaction logging, exception filter, throttle retry |
| `src/widgets/common/` | `@CurrentShop`, ValidationPipe, resolver (gate), projection (whitelist), metafield publisher, sanitize |
| `src/widgets/{popups,app-settings,announcement-bars,product-sliders}/` | 3 module widget + global settings: Admin CRUD + publish metafield |
| `extensions/poptify-widgets/` | **Theme App Extension** (storefront UI cho buyer): app embed popup (Liquid + JS + CSS) |

## Feature: Widgets (Popup / Announcement Bar / Product Slider)

Admin (merchant) cấu hình widget qua **Admin CRUD API** (`/api/popups`, `/api/announcement-bars`,
`/api/product-sliders`, `/api/app-settings`) — bảo vệ bằng `SessionTokenGuard`, scope theo shop
(chống IDOR; cross-shop → 404), DTO validate + sanitize nghiêm.

**Delivery (D6):** MySQL là source-of-truth; mỗi mutation backend **publish projection** (chỉ widget
`enabled`, đã whitelist) lên **app-owned shop metafield** (`$app` namespace, key `settings`/`popups`/
`bars`/`sliders`, type `json`) qua `metafieldsSet`. **Theme App Extension** đọc metafield bằng Liquid
(`shop.metafields.app.<key>.value`) và render cho buyer — **không** gọi backend lúc buyer xem (không
public endpoint/CORS). `app_enabled=false` → mọi key publish rỗng (gate qua event re-publish).

**Deploy extension:** cần `shopify.app.toml` (task 0.5) + Shopify CLI:

```bash
shopify app dev      # preview trên dev store
shopify app deploy   # publish extension + metafield definitions
```

Chi tiết contract + quyết định D6–D10: xem `spec.md` mục "Feature Round 1".

## Shopify

- Embedded app: frontend phát App Bridge session token → backend verify (`SessionTokenGuard`)
  → **Token Exchange** lấy offline access token (mã hóa at-rest).
- Webhook verify HMAC trên **raw body** (timing-safe), idempotent qua `X-Shopify-Webhook-Id`.
- Scopes + webhook topics khai báo declarative trong `shopify.app.toml` (task 0.5).
