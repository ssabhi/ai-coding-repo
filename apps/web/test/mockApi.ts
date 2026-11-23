import { vi } from 'vitest';

interface MockResponse {
  status?: number;
  body: unknown;
}

/** Keyed by "METHOD /path?query"; falls back to "METHOD /path" when no exact match. */
export type Routes = Record<string, MockResponse>;

export interface RecordedCall {
  method: string;
  path: string;
  body?: unknown;
}

/**
 * Stubs `fetch` with canned API responses. Tests exercise the real API client,
 * query hooks and components; only the network is fake.
 */
export function mockApi(routes: Routes): RecordedCall[] {
  const calls: RecordedCall[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: `${url.pathname}${url.search}`, body });

    const route =
      routes[`${method} ${url.pathname}${url.search}`] ?? routes[`${method} ${url.pathname}`];
    const { status, body: responseBody } = route ?? {
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: `No mock for ${method} ${url.pathname}` } },
    };

    return new Response(JSON.stringify(responseBody), {
      status: status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  return calls;
}
