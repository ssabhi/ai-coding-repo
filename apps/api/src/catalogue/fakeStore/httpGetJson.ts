import http from 'node:http';
import https from 'node:https';

export interface HttpGetOptions {
  timeoutMs: number;
  headers?: Record<string, string>;
}

export type HttpGetJson = (url: URL, options: HttpGetOptions) => Promise<unknown>;

/**
 * Minimal JSON GET over node:http(s).
 *
 * Why not global fetch? fakestoreapi.com sits behind Cloudflare, which answers
 * Node's built-in fetch (undici) with a 403 bot challenge, even with a custom
 * User-Agent. node:https with an honest User-Agent is accepted. If that changes,
 * PRODUCT_SOURCE=fixture serves the bundled snapshot instead.
 */
export const httpGetJson: HttpGetJson = (url, { timeoutMs, headers = {} }) =>
  new Promise((resolve, reject) => {
    const client = url.protocol === 'http:' ? http : https;
    const request = client.get(
      url,
      {
        headers: { accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          response.resume(); // discard the body so the socket is released
          reject(new Error(`GET ${url.href} responded with HTTP ${status}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch {
            reject(new Error(`GET ${url.href} returned a body that is not JSON`));
          }
        });
      },
    );

    request.on('error', (error) => {
      reject(
        error.name === 'AbortError' || error.name === 'TimeoutError'
          ? new Error(`GET ${url.href} timed out after ${timeoutMs}ms`)
          : error,
      );
    });
  });
