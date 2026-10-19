import { createClient, FunctionsFetchError } from '@supabase/supabase-js';

import { clasificarError } from '@/features/eventos/dominio/errorDeEscritura';

import { createFetchWithTimeout, FETCH_TIMEOUT_MS } from './fetchWithTimeout';

/** A fetch whose request never gets an answer, unless its signal aborts it. */
function hangingFetch(): jest.MockedFunction<typeof fetch> {
  return jest.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  );
}

describe('createFetchWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives a request 30 seconds, enough for a slow mobile network', () => {
    expect(FETCH_TIMEOUT_MS).toBe(30_000);
  });

  it('answers with the response of a request that comes back in time', async () => {
    const response = new Response('{}', { status: 200 });
    const fetchImpl = jest.fn().mockResolvedValue(response);

    await expect(createFetchWithTimeout(fetchImpl, 1_000)('https://x.test')).resolves.toBe(
      response,
    );
  });

  it('fails a request that never comes back, as a lost connection', async () => {
    const request = createFetchWithTimeout(hangingFetch(), 1_000)('https://x.test', {
      method: 'POST',
    });
    const settled = request.catch((error: unknown) => error);

    jest.advanceTimersByTime(1_000);

    const error = await settled;
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toMatch(/network request failed/i);
  });

  it('does not fail a request before its time is up', async () => {
    const onSettled = jest.fn();
    void createFetchWithTimeout(hangingFetch(), 1_000)('https://x.test').then(onSettled, onSettled);

    jest.advanceTimersByTime(999);
    await Promise.resolve();

    expect(onSettled).not.toHaveBeenCalled();
  });

  it('cancels the request it gives up on', () => {
    const fetchImpl = hangingFetch();
    void createFetchWithTimeout(fetchImpl, 1_000)('https://x.test').catch(() => undefined);

    jest.advanceTimersByTime(1_000);

    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('keeps the options of the request', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response('{}'));
    const headers = { apikey: 'key' };

    await createFetchWithTimeout(fetchImpl, 1_000)('https://x.test', {
      method: 'POST',
      headers,
      body: '{}',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://x.test',
      expect.objectContaining({ method: 'POST', headers, body: '{}' }),
    );
  });

  it('passes on the failure of a request that fails by itself', async () => {
    const failure = new TypeError('Network request failed');
    const fetchImpl = jest.fn().mockRejectedValue(failure);

    await expect(createFetchWithTimeout(fetchImpl, 1_000)('https://x.test')).rejects.toBe(failure);
  });

  it('leaves the deadline to a caller that brings its own signal', async () => {
    const fetchImpl = hangingFetch();
    const controller = new AbortController();
    const onSettled = jest.fn();
    void createFetchWithTimeout(fetchImpl, 1_000)('https://x.test', {
      signal: controller.signal,
    }).then(onSettled, onSettled);

    jest.advanceTimersByTime(5_000);
    await Promise.resolve();

    expect(onSettled).not.toHaveBeenCalled();
    expect(fetchImpl.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});

describe('a Supabase client with the timeout', () => {
  const client = (fetchImpl: typeof fetch) =>
    createClient('https://x.supabase.co', 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: createFetchWithTimeout(fetchImpl, 20) },
    });

  it('ends a hung write in the error of a write without connection', async () => {
    const { error } = await client(hangingFetch()).rpc('guardar_evento', {});

    expect(error).not.toBeNull();
    expect(clasificarError(error?.code, error?.message ?? '')).toBe('sin-conexion');
  });

  it('ends a hung insert with an error instead of waiting forever', async () => {
    const { error } = await client(hangingFetch()).from('reportes').insert({ id: 'r1' });

    expect(error?.message).toMatch(/network request failed/i);
  });

  it('ends a hung server function as a failed fetch', async () => {
    const { error } = await client(hangingFetch()).functions.invoke('invitar', { body: {} });

    expect(error).toBeInstanceOf(FunctionsFetchError);
  });
});
