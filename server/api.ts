import type { IncomingMessage, ServerResponse } from 'node:http';
import { LIMITS, parseRequest } from '../src/llm-contract.ts';
import { generate, type Config } from './llm.ts';

export function createApi(config?: Config, timeoutMs?: number) {
  let busy = false;
  return async (req: IncomingMessage, res: ServerResponse, next: () => void = () => { res.statusCode = 404; res.end(); }) => {
    if (!req.url?.startsWith('/api/')) { next(); return; }
    const send = (status: number, value: unknown) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(value));
    };
    const host = req.headers.host;
    const allowedHost = host === `127.0.0.1:${req.socket.localPort}` || host === `localhost:${req.socket.localPort}`;
    const origin = req.headers.origin;
    if (!allowedHost || (origin && origin !== `http://${host}`) || (req.headers['sec-fetch-site'] === 'cross-site')) { send(403, { error: '不許可のOrigin/Hostです。' }); return; }
    if (req.url === '/api/config' && req.method === 'GET') {
      send(200, { enabled: !!config, endpoint: config?.endpoint, model: config?.model, limits: LIMITS }); return;
    }
    if (req.url !== '/api/generate' || req.method !== 'POST') { send(404, { error: '未対応のAPIです。' }); return; }
    if (!origin || req.headers['content-type'] !== 'application/json') { send(403, { error: '同一OriginのJSONリクエストが必要です。' }); return; }
    if (!config) { send(503, { error: 'LLMのサーバー環境設定が未設定または不正です。' }); return; }
    if (busy) { send(409, { error: '別の生成が処理中です。終了後に明示的に操作してください。' }); return; }
    busy = true;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    res.on('close', cancel);
    // Bounds slow request uploads as well as upstream responses.
    const uploadTimer = setTimeout(() => { controller.abort(); send(408, { error: '入力の受信がtimeoutしました。' }); req.destroy(); }, 10_000);
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        controller.signal.throwIfAborted();
        size += chunk.length;
        if (size > LIMITS.inputBytes + 4096) { send(413, { error: 'LLM入力が大きすぎます。' }); return; }
        chunks.push(chunk);
      }
      clearTimeout(uploadTimer);
      let parsed: unknown;
      try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { send(400, { error: '入力JSONが不正です。' }); return; }
      let selection;
      try { selection = parseRequest(parsed); } catch (e) { send(400, { error: (e as Error).message }); return; }
      const result = await generate(config, selection.events, selection.period, controller.signal, timeoutMs);
      send(200, result);
    } catch (e) {
      // Only application-authored messages; never expose raw provider payloads.
      send(502, { error: controller.signal.aborted ? '生成をキャンセルしました。' : (e as Error).message });
    } finally { clearTimeout(uploadTimer); res.off('close', cancel); busy = false; }
  };
}
