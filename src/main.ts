import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { buildCorsOptions } from './common/security/cors.config';

async function bootstrap(): Promise<void> {
  // rawBody: true → giữ Buffer body gốc cho HMAC verify webhook (task 3.1).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.enableCors(buildCorsOptions(config)); // task 4.1
  app.useGlobalFilters(new AllExceptionsFilter()); // task 4.3

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`Poptify Backend listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
