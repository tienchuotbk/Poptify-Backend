import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

function dataSourceStub(query: jest.Mock): DataSource {
  return { query } as unknown as DataSource;
}

describe('HealthController (task 4.2)', () => {
  it('liveness returns ok without touching the DB', () => {
    const query = jest.fn();
    const controller = new HealthController(dataSourceStub(query));
    expect(controller.liveness()).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
  });

  it('readiness returns ready when the DB responds', async () => {
    const query = jest.fn().mockResolvedValue([{ '1': 1 }]);
    const controller = new HealthController(dataSourceStub(query));
    await expect(controller.readiness()).resolves.toEqual({
      status: 'ready',
      db: 'up',
    });
  });

  it('readiness throws 503 when the DB is down', async () => {
    const query = jest.fn().mockRejectedValue(new Error('connection refused'));
    const controller = new HealthController(dataSourceStub(query));
    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
