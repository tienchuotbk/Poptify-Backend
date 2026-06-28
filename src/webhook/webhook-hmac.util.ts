import { createHmac, timingSafeEqual } from 'crypto';

/** HMAC-SHA256 (base64) trên raw body theo cách Shopify ký webhook. */
export function computeWebhookHmac(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('base64');
}

/**
 * Verify `X-Shopify-Hmac-Sha256` trên RAW body, so sánh **timing-safe**.
 * Length-mismatch → false (không throw). Header rỗng → false.
 */
export function verifyWebhookHmac(
  rawBody: Buffer,
  hmacHeader: string | undefined,
  secret: string,
): boolean {
  if (!hmacHeader) {
    return false;
  }
  const expected = Buffer.from(computeWebhookHmac(rawBody, secret));
  const provided = Buffer.from(hmacHeader);
  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}
