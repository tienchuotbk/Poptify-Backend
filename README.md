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

`synchronize` tắt — schema thay đổi qua migration. (Initial migration: task 1.5.)

## Cấu trúc chính

| Đường dẫn | Vai trò |
|---|---|
| `src/config/env.validation.ts` | Joi schema env (fail-fast) |
| `src/database/` | TypeORM datasource, entities, test datasource (sqljs) |
| `src/shopify/` | `@shopify/shopify-api` instance, SessionStorage, JWT guard, Token Exchange, GraphQL helper, mã hóa token |
| `src/webhook/` | HMAC verify (timing-safe), idempotency, `app/uninstalled`, controller |
| `src/health/` | `/healthz` (liveness), `/readyz` (DB ping) |
| `src/common/` | CORS, CSP middleware, redaction logging, exception filter, throttle retry |

## Shopify

- Embedded app: frontend phát App Bridge session token → backend verify (`SessionTokenGuard`)
  → **Token Exchange** lấy offline access token (mã hóa at-rest).
- Webhook verify HMAC trên **raw body** (timing-safe), idempotent qua `X-Shopify-Webhook-Id`.
- Scopes + webhook topics khai báo declarative trong `shopify.app.toml` (task 0.5).
