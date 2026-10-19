/**
 * How long a request to Supabase can go without an answer. A slow mobile
 * network (2G/EDGE, weak signal) needs a few seconds for the handshakes and a
 * small write; past half a minute nothing is coming, and a person would rather
 * see the error and try again than look at "Guardando…" forever.
 */
export const FETCH_TIMEOUT_MS = 30_000;

/**
 * A fetch that fails a request that gets no answer in `timeoutMs`, and cancels
 * it. It fails as fetch does when the connection drops, so every path that
 * already handles a lost connection handles it too. A caller that brings its
 * own signal (the chat de consulta, which waits longer) keeps its own deadline.
 */
export function createFetchWithTimeout(
  fetchImpl: typeof fetch,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): typeof fetch {
  return (input, init) => {
    if (init?.signal) {
      return fetchImpl(input, init);
    }

    const controller = new AbortController();

    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        reject(new TypeError(`Network request failed: no answer in ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      fetchImpl(input, { ...init, signal: controller.signal })
        .then(resolve, reject)
        .finally(() => clearTimeout(timer));
    });
  };
}
