/**
 * Đăng ký Node runtime adapter cho `@shopify/shopify-api` (side effect, phải chạy
 * trước khi gọi `shopifyApi(...)`).
 *
 * Dùng dynamic specifier + require thay vì `import '@shopify/shopify-api/adapters/node'`:
 * package ship cả file `.ts` nguồn, và với `module: commonjs` (classic node
 * resolution) tsc bỏ qua `exports` map → trỏ vào `adapters/node/index.ts` rồi
 * biên dịch source lib (lỗi type nội bộ). Specifier động khiến tsc không kéo
 * file đó vào program; runtime vẫn resolve qua `exports` sang bản dist CJS.
 */
const adapterModule = '@shopify/shopify-api/adapters/node';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require(adapterModule);

export {};
