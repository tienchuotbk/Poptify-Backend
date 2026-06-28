import { NextFunction, Request, Response } from 'express';
import { ShopifyCspMiddleware } from './shopify-csp.middleware';

interface FakeRes {
  headers: Record<string, string>;
  removed: string[];
  setHeader: (k: string, v: string) => void;
  removeHeader: (k: string) => void;
}

function mockRes(): FakeRes {
  const headers: Record<string, string> = {};
  const removed: string[] = [];
  return {
    headers,
    removed,
    setHeader: (k, v) => {
      headers[k] = String(v);
    },
    removeHeader: (k) => {
      removed.push(k);
    },
  };
}

describe('ShopifyCspMiddleware (task 4.1)', () => {
  const middleware = new ShopifyCspMiddleware();

  it('sets frame-ancestors for a valid shop and removes X-Frame-Options', () => {
    const res = mockRes();
    const next = jest.fn();
    middleware.use(
      { query: { shop: 'test.myshopify.com' } } as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction,
    );

    const csp = res.headers['Content-Security-Policy'];
    expect(csp).toContain('https://test.myshopify.com');
    expect(csp).toContain('https://admin.shopify.com');
    expect(res.removed).toContain('X-Frame-Options');
    expect(next).toHaveBeenCalled();
  });

  it('falls back to a generic policy for an invalid shop', () => {
    const res = mockRes();
    const next = jest.fn();
    middleware.use(
      { query: { shop: 'evil.com' } } as unknown as Request,
      res as unknown as Response,
      next as unknown as NextFunction,
    );

    expect(res.headers['Content-Security-Policy']).toContain(
      'https://*.myshopify.com',
    );
    expect(next).toHaveBeenCalled();
  });
});
