import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost(req: unknown): {
  host: ArgumentsHost;
  res: { status: jest.Mock; json: jest.Mock };
} {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AllExceptionsFilter (task 4.3)', () => {
  const filter = new AllExceptionsFilter();
  const req = {
    method: 'GET',
    url: '/x',
    headers: { authorization: 'Bearer super-secret' },
    body: {},
  };

  it('returns a structured shape for HttpException', () => {
    const { host, res } = makeHost(req);
    filter.catch(new BadRequestException('bad input'), host);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      error: 'bad input',
      path: '/x',
    });
  });

  it('does not leak details for 5xx', () => {
    const { host, res } = makeHost(req);
    filter.catch(new Error('DB password is hunter2'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.error).toBe('Internal server error');
    expect(JSON.stringify(payload)).not.toContain('hunter2');
  });

  it('redacts secrets in the logged context', () => {
    const spy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { host } = makeHost(req);

    filter.catch(new BadRequestException('x'), host);

    const logged = spy.mock.calls[0].join(' ');
    expect(logged).not.toContain('super-secret');
    expect(logged).toContain('[REDACTED]');
    spy.mockRestore();
  });
});
