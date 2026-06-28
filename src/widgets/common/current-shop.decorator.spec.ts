import { UnauthorizedException } from '@nestjs/common';
import { resolveShopFromRequest } from './current-shop.decorator';

describe('resolveShopFromRequest (task 6.3)', () => {
  it('trích shop domain từ claim dest (URL đầy đủ)', () => {
    expect(
      resolveShopFromRequest({
        shopifySession: { dest: 'https://acme.myshopify.com' },
      }),
    ).toBe('acme.myshopify.com');
  });

  it('bỏ path/query, chỉ lấy hostname', () => {
    expect(
      resolveShopFromRequest({
        shopifySession: { dest: 'https://acme.myshopify.com/admin?foo=1' },
      }),
    ).toBe('acme.myshopify.com');
  });

  it('chấp nhận bare domain (không scheme)', () => {
    expect(
      resolveShopFromRequest({
        shopifySession: { dest: 'acme.myshopify.com' },
      }),
    ).toBe('acme.myshopify.com');
  });

  it('throw khi không có session (chống nhận shop từ nơi khác)', () => {
    expect(() => resolveShopFromRequest({})).toThrow(UnauthorizedException);
    expect(() => resolveShopFromRequest({ shopifySession: {} })).toThrow(
      UnauthorizedException,
    );
  });

  it('throw với subdomain chaining attack (acme.myshopify.com.evil.com)', () => {
    expect(() =>
      resolveShopFromRequest({
        shopifySession: { dest: 'https://acme.myshopify.com.evil.com' },
      }),
    ).toThrow(UnauthorizedException);
  });

  it('throw khi dest không phải *.myshopify.com', () => {
    expect(() =>
      resolveShopFromRequest({
        shopifySession: { dest: 'https://evil.example.com' },
      }),
    ).toThrow(UnauthorizedException);
  });

  it('throw khi dest không phải string', () => {
    expect(() =>
      resolveShopFromRequest({ shopifySession: { dest: 12345 } }),
    ).toThrow(UnauthorizedException);
  });
});
