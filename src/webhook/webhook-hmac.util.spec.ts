import { createHmac } from 'crypto';
import { computeWebhookHmac, verifyWebhookHmac } from './webhook-hmac.util';

const SECRET = 'test-api-secret';

describe('webhook-hmac util (task 3.1)', () => {
  const body = Buffer.from(JSON.stringify({ shop_id: 1 }));
  const validHmac = createHmac('sha256', SECRET).update(body).digest('base64');

  it('computes a base64 HMAC matching crypto', () => {
    expect(computeWebhookHmac(body, SECRET)).toBe(validHmac);
  });

  it('accepts a valid HMAC', () => {
    expect(verifyWebhookHmac(body, validHmac, SECRET)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const tampered = Buffer.from(JSON.stringify({ shop_id: 2 }));
    expect(verifyWebhookHmac(tampered, validHmac, SECRET)).toBe(false);
  });

  it('rejects a wrong-length header without throwing', () => {
    expect(verifyWebhookHmac(body, 'too-short', SECRET)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifyWebhookHmac(body, undefined, SECRET)).toBe(false);
  });

  it('rejects an HMAC signed with a different secret', () => {
    const other = createHmac('sha256', 'other-secret')
      .update(body)
      .digest('base64');
    expect(verifyWebhookHmac(body, other, SECRET)).toBe(false);
  });
});
