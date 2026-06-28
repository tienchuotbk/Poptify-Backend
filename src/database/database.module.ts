import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { entities } from './entities';

/**
 * Kết nối DB qua TypeORM.
 * - NODE_ENV=test → sqljs in-memory (synchronize) để test không cần MySQL/Docker.
 * - còn lại → MySQL từ env, `synchronize:false`, dùng migration (task 1.5).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        if (config.get<string>('NODE_ENV') === 'test') {
          return {
            type: 'sqljs',
            autoSave: false,
            synchronize: true,
            entities,
          };
        }

        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          entities,
          synchronize: false,
          migrationsRun: false,
          migrations: [__dirname + '/migrations/*.{ts,js}'],
        };
      },
    }),
  ],
})
export class DatabaseModule {}
