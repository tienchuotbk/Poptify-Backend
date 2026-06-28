import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopifyCspMiddleware } from './common/security/shopify-csp.middleware';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ShopifyModule } from './shopify/shopify.module';
import { WebhookModule } from './webhook/webhook.module';
import { AppSettingsModule } from './widgets/app-settings/app-settings.module';
import { WidgetsCommonModule } from './widgets/common/widgets-common.module';
import { PopupsModule } from './widgets/popups/popups.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    ShopifyModule,
    WidgetsCommonModule,
    AppSettingsModule,
    PopupsModule,
    WebhookModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // Global ValidationPipe (task 6.3) — đăng ký qua APP_PIPE để áp dụng cả
      // trong e2e (createNestApplication), không chỉ main.ts. whitelist +
      // forbidNonWhitelisted chống mass-assignment / field thừa; transform để
      // class-validator chạy trên instance DTO đã transform.
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // CSP frame-ancestors cho mọi route (task 4.1).
    consumer.apply(ShopifyCspMiddleware).forRoutes('*');
  }
}
