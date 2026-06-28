import type { shopifyApi } from '@shopify/shopify-api';

/** DI token cho instance `@shopify/shopify-api` đã cấu hình. */
export const SHOPIFY_API = Symbol('SHOPIFY_API');

/** Kiểu của instance trả về từ `shopifyApi(...)`. */
export type ShopifyApi = ReturnType<typeof shopifyApi>;
