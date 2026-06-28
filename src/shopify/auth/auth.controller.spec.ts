import { AuthController } from './auth.controller';
import { TokenExchangeService } from './token-exchange.service';

const SHOP = 'acme.myshopify.com';

describe('AuthController (task 13.1)', () => {
  function build() {
    const exchangeOffline = jest.fn().mockResolvedValue({});
    const ctrl = new AuthController({
      exchangeOffline,
    } as unknown as TokenExchangeService);
    return { ctrl, exchangeOffline };
  }

  it('gọi exchangeOffline với shop + token tách từ header Bearer', async () => {
    const { ctrl, exchangeOffline } = build();
    const res = await ctrl.exchange(SHOP, 'Bearer abc.def.ghi');
    expect(exchangeOffline).toHaveBeenCalledWith(SHOP, 'abc.def.ghi');
    expect(res).toEqual({ shop: SHOP, installed: true });
  });

  it('header thiếu → token rỗng (không crash)', async () => {
    const { ctrl, exchangeOffline } = build();
    await ctrl.exchange(SHOP, undefined);
    expect(exchangeOffline).toHaveBeenCalledWith(SHOP, '');
  });
});
