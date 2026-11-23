import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { httpGetJson } from '../src/catalogue/fakeStore/httpGetJson.js';

let server: http.Server;
let baseUrl: string;
let lastUserAgent: string | undefined;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    lastUserAgent = req.headers['user-agent'];
    switch (req.url) {
      case '/ok':
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"hello":"world"}');
        break;
      case '/blocked':
        res.writeHead(403, { 'content-type': 'text/html' }).end('<html>Just a moment...</html>');
        break;
      case '/not-json':
        res.writeHead(200).end('<html></html>');
        break;
      case '/slow':
        setTimeout(() => res.writeHead(200).end('{}'), 500);
        break;
      default:
        res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

describe('httpGetJson', () => {
  it('returns the parsed JSON body and sends the given headers', async () => {
    const body = await httpGetJson(new URL(`${baseUrl}/ok`), {
      timeoutMs: 1000,
      headers: { 'user-agent': 'test-agent' },
    });
    expect(body).toEqual({ hello: 'world' });
    expect(lastUserAgent).toBe('test-agent');
  });

  it('rejects on a non-2xx status, such as a Cloudflare challenge', async () => {
    await expect(httpGetJson(new URL(`${baseUrl}/blocked`), { timeoutMs: 1000 })).rejects.toThrow(
      'HTTP 403',
    );
  });

  it('rejects when the body is not JSON', async () => {
    await expect(httpGetJson(new URL(`${baseUrl}/not-json`), { timeoutMs: 1000 })).rejects.toThrow(
      'not JSON',
    );
  });

  it('rejects when the server takes longer than the timeout', async () => {
    await expect(httpGetJson(new URL(`${baseUrl}/slow`), { timeoutMs: 50 })).rejects.toThrow(
      'timed out after 50ms',
    );
  });
});
