import { Inject, Injectable } from '@nestjs/common';
import { Session } from '@shopify/shopify-api';
import { SHOPIFY_API, ShopifyApi } from '../shopify.constants';
import { withThrottleRetry } from './throttle-retry';

/**
 * Helper gọi Admin GraphQL (task 2.6). apiVersion pin 1 chỗ ở instance
 * `@shopify/shopify-api` (từ config); bọc retry khi THROTTLED/429 (task 4.4).
 */
@Injectable()
export class AdminGraphqlService {
  constructor(@Inject(SHOPIFY_API) private readonly shopify: ShopifyApi) {}

  async query<T = unknown>(
    session: Session,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    return withThrottleRetry(async () => {
      const client = new this.shopify.clients.Graphql({ session });
      const response = await client.request<T>(
        query,
        variables ? { variables } : undefined,
      );
      return response.data as T;
    });
  }
}
