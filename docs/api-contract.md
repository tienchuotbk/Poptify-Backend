# Poptify Backend — API Contract (cho Admin UI / `frontend/`)

> Hand-off contract để FE (Admin React + Polaris + App Bridge) khớp với BE.
> Nguồn sự thật chi tiết: `spec.md` mục "Feature Round 1" + `src/widgets/**/dto/*.ts`.
> FE đọc file này qua `../backend/docs/api-contract.md` (sibling subproject trong workspace).
>
> **Phạm vi:** đây là REST API của Admin UI. Storefront (theme app extension) đã nằm
> trong repo BE (`extensions/poptify-widgets/`) — FE **không** đụng tới.

## 1. Auth (mọi request)

- App nhúng trong Shopify Admin iframe. FE dùng **App Bridge** lấy **session token** (JWT) và gửi:
  `Authorization: Bearer <session token>` trên **mọi** request.
- Token hết hạn nhanh (~1 phút) → dùng `useAuthenticatedFetch` / App Bridge `getSessionToken()` để
  lấy token mới mỗi request.
- **Install/khởi tạo:** FE lúc load gọi `POST /api/auth/token-exchange` **một lần** để BE đổi session
  token → offline token (điều kiện để widget config publish ra storefront).
- Thiếu/sai token → **401**. Shop được suy ra từ token (claim `dest`) — **KHÔNG** gửi `shop` trong body/query.

```
POST /api/auth/token-exchange
→ 200 { "shop": "acme.myshopify.com", "installed": true }
```

## 2. Quy ước chung

- Base path: `/api`. JSON in/out.
- **Status:** `200` OK · `201` Created (POST) · `204` No Content (DELETE) · `400` validation · `401` auth · `404` không thuộc shop.
- **Validation nghiêm:** field thừa → 400; sai enum/URL/màu → 400. URL chỉ nhận `https://`. Màu = hex (`#rrggbb`).
- **Error shape:**
  ```json
  { "statusCode": 400, "error": "name must be shorter than or equal to 255 characters", "timestamp": "2026-06-28T00:00:00.000Z", "path": "/api/popups" }
  ```
  (5xx → `error: "Internal server error"`, không leak chi tiết.)
- **Shop isolation:** chỉ thấy/sửa resource của shop mình; id của shop khác → **404**.

## 3. Enums dùng chung

| Enum | Giá trị |
|---|---|
| `DeviceTarget` | `all` `desktop` `mobile` |
| `PageTarget` | `all` `homepage` `product` `collection` `cart` |

## 4. App Settings (1 record/shop)

```
GET /api/app-settings        → 200 AppSettings
PUT /api/app-settings  body: UpdateAppSettings → 200 AppSettings
```

`UpdateAppSettings` (mọi field optional):
```ts
{
  appEnabled?: boolean;
  deviceTarget?: DeviceTarget;
  globalPageTarget?: PageTarget;
  schedule?: { startDate?: string /*ISO-8601, có offset/Z*/; endDate?: string; timezone?: string /*IANA, max 64*/ };
}
```
`AppSettings` (response):
```ts
{ id: number; shop: string; appEnabled: boolean; deviceTarget: DeviceTarget;
  globalPageTarget: PageTarget; startDate: string|null; endDate: string|null;
  timezone: string|null; createdAt: string; updatedAt: string }
```
- GET tạo default lúc first-access (`appEnabled=false`, target `all`).
- Đổi `appEnabled` → BE tự re-publish lại metafield mọi widget (off → storefront rỗng).

## 5. Popups

```
GET    /api/popups         → 200 Popup[]
POST   /api/popups   body: CreatePopup → 201 Popup
GET    /api/popups/:id     → 200 Popup | 404
PATCH  /api/popups/:id body: UpdatePopup(partial) → 200 Popup | 404
DELETE /api/popups/:id     → 204 | 404
```
`CreatePopup`:
```ts
{
  name: string;                          // required, max 255, plain-text (HTML bị strip)
  type: 'discount'|'newsletter'|'exit_intent'; // required
  enabled?: boolean;                     // default false
  priority?: number;                     // int >= 0
  triggerConfig?: { type: 'page_load'|'time_delay'|'scroll_percentage'|'exit_intent'; value?: string /*max 16, vd "5"/"30"*/ };
  frequencyConfig?: { frequency: 'every_visit'|'once_per_session'|'once_per_day'|'once_per_week' };
  targetPages?: PageTarget[];
  designConfig?: {
    width?: string; position?: 'center'|'bottom_left'|'bottom_right';
    backgroundColor?: string /*hex*/; textColor?: string /*hex*/;
    borderRadius?: string; imageUrl?: string /*https, max 2048*/; showCloseButton?: boolean;
  };
  contentConfig?: {
    title?: string; description?: string; couponCode?: string;        // discount = text-only
    buttonText?: string; buttonLink?: string /*https*/;
    emailInputEnabled?: boolean; submitButtonText?: string; successMessage?: string; // newsletter (KHÔNG thu email ở BE)
  };
}
```
`UpdatePopup` = mọi field của `CreatePopup` thành optional (PATCH).
`Popup` (response): các field trên + `id:number`, `publicId:string` (uuid — khóa client storefront), `shop`, `schemaVersion`, `createdAt`, `updatedAt`.

## 6. Announcement Bars

```
GET/POST /api/announcement-bars · GET/PATCH/DELETE /api/announcement-bars/:id
```
`CreateAnnouncementBar`:
```ts
{
  name: string;                          // required, max 255, plain-text
  type: 'simple'|'countdown'|'free_shipping_progress'; // required
  enabled?: boolean; priority?: number;
  position?: 'top'|'bottom';             // default top
  sticky?: boolean;
  contentConfig?: {
    text?: string /*max 500*/; buttonText?: string; buttonLink?: string /*https*/;  // simple
    endDate?: string /*ISO-8601*/; expiredMessage?: string;                          // countdown
    goalAmount?: number /*>=0*/; progressText?: string; successText?: string;        // free_shipping_progress
  };
  styleConfig?: { backgroundColor?: string /*hex*/; textColor?: string /*hex*/; fontSize?: string; height?: string };
  visibilityRules?: { deviceTarget?: DeviceTarget; targetPages?: PageTarget[] };
}
```
`Update` = partial. Response = field trên + `id`, `publicId`, `shop`, `schemaVersion`, timestamps.

## 7. Product Sliders

```
GET/POST /api/product-sliders · GET/PATCH/DELETE /api/product-sliders/:id
```
`CreateProductSlider`:
```ts
{
  name: string;                          // required, max 255, plain-text
  sourceType: 'featured'|'collection';   // required (best_sellers KHÔNG hỗ trợ → 400)
  enabled?: boolean; priority?: number;
  sourceConfig?: {
    productHandles?: string[] /*featured; handle (a-z0-9-_), tối đa 50*/;
    collectionHandle?: string /*collection; handle*/;
  };
  layoutConfig?: { desktopItems?: number /*1-12*/; tabletItems?: number; mobileItems?: number; rows?: number /*1-12*/; spacing?: string };
  behaviorConfig?: { autoplay?: boolean; autoplaySpeed?: number /*0-60000 ms*/; infiniteLoop?: boolean; showArrows?: boolean; showDots?: boolean };
  displayConfig?: { showImage?: boolean; showTitle?: boolean; showPrice?: boolean; showComparePrice?: boolean; showAddToCart?: boolean; showSaleBadge?: boolean };
  placementConfig?: {
    targetPages?: PageTarget[];
    placementPosition?: 'above_product_description'|'below_product_description'|'custom_selector';
    customSelector?: string /*CSS selector, max 128, cấm `<`*/;
  };
}
```
`Update` = partial. Response = field trên + `id`, `publicId`, `shop`, `schemaVersion`, timestamps.

> **Lưu ý slider:** storefront render product **Liquid-native qua handle** → FE lưu **handle**
> (App Bridge resource picker trả cả id + handle, lấy handle). Không cần resolve product ở Admin.

## 8. Gợi ý cho FE

- **Codegen:** nếu muốn type tự động, đề nghị BE bật `@nestjs/swagger` để sinh `openapi.json` → FE codegen (openapi-typescript/orval). Hiện tại type lấy theo file này.
- **Polaris React** (`@shopify/polaris`, KHÔNG `<s-*>`) + **App Bridge React** (`useAppBridge`, `useAuthenticatedFetch`, resource picker). Xem `docs/shopify-conventions.md`.
- Flow Admin: load → `token-exchange` → `GET /api/app-settings` (+ list mỗi widget) → form Polaris CRUD → mỗi save BE tự publish metafield → preview storefront.
- Đổi contract BE → cập nhật lại file này (hoặc regenerate `openapi.json`).
