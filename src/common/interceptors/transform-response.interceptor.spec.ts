import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';

/**
 * The envelope is the API's actual wire contract, and a DTO that falls into the
 * wrong branch here ships `data` one level too deep — which type-checks on both
 * sides and only fails at runtime (`p.data.map is not a function`). These cases
 * pin each branch down.
 */
function run(value: unknown, method = 'GET') {
  const context = {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode: 200 }),
      getRequest: () => ({ method, res: { headersSent: false } }),
    }),
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;

  const next: CallHandler = { handle: () => of(value) };
  const interceptor = new TransformResponseInterceptor(new Reflector());
  return firstValueFrom(interceptor.intercept(context, next)) as Promise<Record<string, any>>;
}

describe('TransformResponseInterceptor', () => {
  it('hoists `data` and keeps `pagination` beside it for table lists', async () => {
    const body = await run({
      data: [{ id: 'BRD001' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('hoists `data` and keeps `nextCursor` beside it for dropdowns', async () => {
    const body = await run({ data: [{ id: 'BRD001', name: 'กล่อง' }], nextCursor: 'eyJzIjoi' });

    // The bug this guards: without the cursor branch, body.data was
    // `{ data: [...], nextCursor }` and every `page.data.map(...)` threw.
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.nextCursor).toBe('eyJzIjoi');
  });

  it('treats `nextCursor: null` as the exhausted-list case, not as a missing key', async () => {
    const body = await run({ data: [], nextCursor: null });

    expect(Array.isArray(body.data)).toBe(true);
    expect(body.nextCursor).toBeNull();
  });

  it('wraps a plain entity under `data`', async () => {
    const body = await run({ id: 'BRD001', name: 'กล่อง' });

    expect(body.data).toEqual({ id: 'BRD001', name: 'กล่อง' });
    expect(body).not.toHaveProperty('nextCursor');
  });

  it('wraps a bare array under `data` without treating it as an envelope', async () => {
    const body = await run([{ id: 'BRD001' }]);

    expect(body.data).toEqual([{ id: 'BRD001' }]);
    expect(body).not.toHaveProperty('pagination');
  });
});
