import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { ShopifySessionEntity } from '../../database/entities/shopify-session.entity';
import {
  decryptToken,
  encryptToken,
  tokenEncryptionTransformer,
} from './token-encryption';

describe('token-encryption (task 2.5)', () => {
  it('round-trips encrypt → decrypt', () => {
    const encrypted = encryptToken('shpat_secret_token');
    expect(encrypted).not.toContain('shpat_secret_token');
    expect(decryptToken(encrypted)).toBe('shpat_secret_token');
  });

  it('uses a random IV (ciphertext differs each call)', () => {
    expect(encryptToken('same-input')).not.toBe(encryptToken('same-input'));
  });

  it('transformer passes through null/undefined', () => {
    expect(tokenEncryptionTransformer.to(null)).toBeNull();
    expect(tokenEncryptionTransformer.from(undefined)).toBeUndefined();
  });

  describe('at-rest via repository', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
      dataSource = await createTestDataSource();
    });

    afterAll(async () => {
      await dataSource.destroy();
    });

    it('persists ciphertext but reads back plaintext', async () => {
      const repo = dataSource.getRepository(ShopifySessionEntity);
      await repo.save(
        repo.create({
          id: 'enc-1',
          shop: 'a.myshopify.com',
          state: '',
          isOnline: false,
          accessToken: 'plain-token',
        }),
      );

      const raw = await dataSource.query(
        "SELECT accessToken AS t FROM shopify_sessions WHERE id = 'enc-1'",
      );
      expect(raw[0].t).not.toBe('plain-token');

      const loaded = await repo.findOneByOrFail({ id: 'enc-1' });
      expect(loaded.accessToken).toBe('plain-token');
    });
  });
});
