import { redact } from './redact';

describe('redact (task 4.3)', () => {
  it('masks sensitive keys but keeps the rest', () => {
    const out = redact({
      accessToken: 'secret-token',
      shop: 'a.myshopify.com',
      nested: { authorization: 'Bearer xyz', name: 'keep-me' },
      list: [{ apiSecret: 's' }],
    });

    expect(out.accessToken).toBe('[REDACTED]');
    expect(out.shop).toBe('a.myshopify.com');
    expect(out.nested.authorization).toBe('[REDACTED]');
    expect(out.nested.name).toBe('keep-me');
    expect(out.list[0].apiSecret).toBe('[REDACTED]');
  });

  it('masks PII (email/phone)', () => {
    const out = redact({ email: 'x@y.com', phone: '+84123' });
    expect(out.email).toBe('[REDACTED]');
    expect(out.phone).toBe('[REDACTED]');
  });

  it('does not throw on circular references', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    expect(() => redact(obj)).not.toThrow();
  });
});
