import { DataSource } from 'typeorm';
import { entities } from '../entities';

/**
 * DataSource sqljs in-memory cho test (không cần MySQL/Docker).
 * synchronize:true tạo schema từ entity; mỗi test nên tự destroy().
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'sqljs',
    autoSave: false,
    synchronize: true,
    entities,
  });
  await dataSource.initialize();
  return dataSource;
}
