import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopEntity } from '../database/entities/shop.entity';
import { ShopifySessionEntity } from '../database/entities/shopify-session.entity';
import { AuthController } from './auth/auth.controller';
import { SessionTokenGuard } from './auth/session-token.guard';
import { TokenExchangeService } from './auth/token-exchange.service';
import { AdminGraphqlService } from './graphql/admin-graphql.service';
import { TypeormSessionStorage } from './session/typeorm-session.storage';
import { SHOPIFY_API } from './shopify.constants';
import { shopifyApiProvider } from './shopify.provider';

/**
 * Tầng tích hợp Shopify (Phase 2). @Global để guard/service inject ở mọi nơi.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ShopifySessionEntity, ShopEntity])],
  controllers: [AuthController],
  providers: [
    shopifyApiProvider,
    TypeormSessionStorage,
    SessionTokenGuard,
    TokenExchangeService,
    AdminGraphqlService,
  ],
  exports: [
    SHOPIFY_API,
    TypeormSessionStorage,
    SessionTokenGuard,
    TokenExchangeService,
    AdminGraphqlService,
  ],
})
export class ShopifyModule {}
