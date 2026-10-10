import { createServer, type Server } from 'node:http';
import type { HistoryEvent } from '../../src/domain.ts';

export function resultFor(data: { events: HistoryEvent[]; projects?: string[] }) {
  const first = data.events[0];
  const item = { text: '架空の記録を確認した。', tone: 'fact', evidenceRefs: [first.eventId] };
  if (!data.projects) return { notes: [item] };
  return {
    conversation: [
      ...data.projects.map(speaker => ({ ...item, speaker, role: 'agent', evidenceRefs: [data.events.find(e => e.projectId === speaker)!.eventId] })),
      { role: 'host', speaker: 'master', text: '仮説を確かめてから、他プロジェクトの改善を試そう。', tone: 'suggestion', evidenceRefs: data.events.slice(0, 2).map(e => e.eventId) },
    ],
    receipt: { insights: [item], actions: [{ ...item, tone: 'suggestion', text: '提案：再現条件を確認する。' }], unresolved: [] },
  };
}
export async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
export async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
}
export function createStub() {
  const calls: { body: any; authorization?: string; path?: string }[] = [];
  let mode = 'ok';
  let disconnected = 0;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    calls.push({ body, authorization: req.headers.authorization, path: req.url });
    res.on('close', () => { if (!res.writableEnded) disconnected++; });
    if (mode === 'slow') return;
    if (mode === 'slow-body') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{'); return; }
    if (mode === 'http') { res.writeHead(429); res.end('secret provider details'); return; }
    if (mode === 'redirect') { res.writeHead(307, { Location: '/unexpected' }); res.end(); return; }
    if (mode === 'oversize') { res.end('x'.repeat(65537)); return; }
    if (mode === 'bad-envelope') { res.end('{'); return; }
    const data = JSON.parse(body.messages[1].content);
    const result = resultFor(data);
    if (mode === 'bad-ref' || (mode === 'host-bad-ref' && data.projects)) (result.notes ?? result.conversation)![0].evidenceRefs = ['outside'];
    if (mode === 'long') (result.notes ?? result.conversation)![0].text = 'x'.repeat(501);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ finish_reason: mode === 'truncated' ? 'length' : 'stop', message: { content: mode === 'bad-json' ? '{' : JSON.stringify(result), ...(mode === 'tool' ? { tool_calls: [] } : {}) } }], ...((mode === 'no-usage' || (mode === 'partial-usage' && calls.length === 2)) ? {} : { usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }) }));
  });
  return { server, calls, setMode: (value: string) => { mode = value; }, get disconnected() { return disconnected; } };
}
