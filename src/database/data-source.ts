import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { entities } from './entities';

// DataSource dùng cho TypeORM CLI (migration:generate/run/revert).
// Env do shell/CI cung cấp; loadEnv() đọc .env nếu có (local).
loadEnv();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});
