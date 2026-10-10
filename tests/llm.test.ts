import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApi } from '../server/api.ts';
import { readConfig } from '../server/llm.ts';
import { LIMITS, parseResult, parseResearch } from '../src/llm-contract.ts';
import { demoHistory, DemoProvider, toMarkdown } from '../src/provider.ts';
import { getPeriod, selectEvents } from '../src/domain.ts';
import { createStub, resultFor, listen, close } from './support/stub.ts';

const period = getPeriod('demo');
const events = selectEvents(demoHistory, ['komorebi', 'minato', 'tsubame'], period);
const secret = 'fictional-test-key-never-in-client';
async function harness(timeout = 500) {
  const stub = createStub();
  const upstream = await listen(stub.server);
  const config = readConfig({ IZAKAYA_LLM_BASE_URL: upstream + '/v1', IZAKAYA_LLM_MODEL: 'fictional-stub', IZAKAYA_LLM_API_KEY: secret })!;
  const app = createServer(createApi(config, timeout));
  const url = await listen(app);
  const post = (value: unknown = { events, period }, signal?: AbortSignal) => fetch(url + '/api/generate', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify(value), signal });
  return { stub, app, url, post, async cleanup() { await close(app); await close(stub.server); } };
}

test('HTTP: project-scoped research → host → validated receipt, four requests and no leaked key', async () => {
  const h = await harness();
  try {
    const response = await h.post({ events, period, endpoint: 'https://unapproved.invalid', apiKey: 'ignored' });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.provenance.requests, 4);
    assert.deepEqual(result.provenance.usage, { prompt_tokens: 40, completion_tokens: 80, total_tokens: 120 });
    assert.equal(h.stub.calls.length, 4);
    for (const [index, call] of h.stub.calls.entries()) {
      const data = JSON.parse(call.body.messages[1].content);
      assert.equal(call.authorization, `Bearer ${secret}`);
      assert.equal(call.path, '/v1/chat/completions');
      assert.equal(call.body.n, 1);
      assert.equal(call.body.stream, false);
      assert.equal(call.body.max_completion_tokens, index === 3 ? 2400 : 1200);
      assert.equal(call.body.tools, undefined);
      assert.ok(data.events.every((e: any) => events.some(selected => selected.eventId === e.eventId)));
      assert.ok(!JSON.stringify(call.body).includes('k-before'));
      assert.ok(!JSON.stringify(call.body).includes('t-after'));
      if (index < 3) assert.deepEqual([...new Set(data.events.map((e: any) => e.projectId))], [data.projectId]);
      else assert.equal(data.research.length, 3);
    }
    const metadata = await (await fetch(h.url + '/api/config')).text();
    assert.ok(!metadata.includes(secret));
    assert.ok(!JSON.stringify(result).includes(secret));
    const md = toMarkdown(result, events);
    assert.match(md, /LLM生成/); assert.match(md, /fictional/); assert.match(md, /真実性/);
    assert.ok(!md.includes(secret));
  } finally { await h.cleanup(); }
});
test('HTTP: selected project/period isolation and empty input makes zero upstream requests', async () => {
  const h = await harness();
  try {
    const own = events.filter(e => e.projectId === 'minato');
    assert.equal((await h.post({ events: own, period })).status, 200);
    assert.equal(h.stub.calls.length, 2);
    assert.ok(!JSON.stringify(h.stub.calls).includes('komorebi'));
    assert.equal((await h.post({ events: [], period })).status, 200);
    assert.equal(h.stub.calls.length, 2);
    assert.equal((await h.post({ events: demoHistory.events, period })).status, 400);
    assert.equal(h.stub.calls.length, 2);
  } finally { await h.cleanup(); }
});
test('HTTP: forbidden Origin/Host/missing Origin, too many projects, input bounds, malformed input and concurrent generation', async () => {
  const h = await harness(2000);
  try {
    for (const headers of [{ Origin: 'https://evil.example' }, { Origin: 'null' }, { Host: 'evil.example' }, {}] as Record<string, string>[]) {
      assert.equal((await fetch(h.url + '/api/generate', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    }
    const many = [...events, { ...events[0], eventId: 'extra', projectId: 'fourth' }];
    assert.equal((await h.post({ events: many, period })).status, 400);
    assert.equal((await h.post({ events: Array.from({ length: 61 }, (_, i) => ({ ...events[0], eventId: `e${i}` })), period })).status, 400);
    assert.equal((await h.post({ events: Array.from({ length: 15 }, (_, i) => ({ ...events[0], eventId: `e${i}`, text: 'x'.repeat(4000) })), period })).status, 413);
    assert.equal((await h.post(null)).status, 400);
    assert.equal((await fetch(h.url + '/api/generate', { method: 'POST', headers: { Origin: h.url, 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await h.post({ events: Array.from({ length: 13 }, (_, i) => ({ ...events[0], eventId: `e${i}`, text: 'x'.repeat(3700) })), period })).status, 400);
    assert.equal(h.stub.calls.length, 0);
    h.stub.setMode('slow');
    const controller = new AbortController();
    const pending = h.post(undefined, controller.signal).catch(() => undefined);
    while (!h.stub.calls.length) await new Promise(r => setTimeout(r, 5));
    assert.equal((await h.post()).status, 409);
    controller.abort(); await pending;
  } finally { await h.cleanup(); }
});
test('HTTP: failures reject once, no retries; timeout/cancel stop subsequent agent and host calls', async () => {
  for (const mode of ['http', 'redirect', 'oversize', 'bad-envelope', 'bad-json', 'bad-ref', 'long', 'truncated', 'tool', 'slow', 'slow-body', 'host-bad-ref']) {
    const h = await harness(80);
    try {
      h.stub.setMode(mode);
      const response = await h.post();
      assert.equal(response.status, 502, mode);
      const body = await response.text();
      assert.ok(!body.includes('secret provider details'));
      assert.equal(h.stub.calls.length, mode === 'host-bad-ref' ? 4 : 1, mode);
      if (mode.startsWith('slow')) assert.match(body, /timeout/);
    } finally { await h.cleanup(); }
  }
  const h = await harness(2000);
  try {
    h.stub.setMode('slow');
    const controller = new AbortController();
    const pending = h.post(undefined, controller.signal);
    while (!h.stub.calls.length) await new Promise(r => setTimeout(r, 5));
    controller.abort();
    await assert.rejects(pending);
    for (let i = 0; i < 50 && !h.stub.disconnected; i++) await new Promise(r => setTimeout(r, 5));
    assert.equal(h.stub.disconnected, 1);
    assert.equal(h.stub.calls.length, 1);
    h.stub.setMode('ok');
    assert.equal((await h.post()).status, 200);
  } finally { await h.cleanup(); }
});
test('HTTP: no usage is unknown, unconfigured backend leaves demo available', async () => {
  const h = await harness();
  try {
    h.stub.setMode('partial-usage');
    assert.equal((await (await h.post()).json()).provenance.usage, null);
    h.stub.setMode('no-usage');
    assert.equal((await (await h.post()).json()).provenance.usage, null);
  } finally { await h.cleanup(); }
  const app = createServer(createApi()); const url = await listen(app);
  try {
    assert.equal((await (await fetch(url + '/api/config')).json()).enabled, false);
    assert.equal((await fetch(url + '/api/generate', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' }, body: '{}' })).status, 503);
    assert.equal((await new DemoProvider().generate(events, period, 'sample')).mode, 'sample');
    const c = new AbortController(); c.abort();
    await assert.rejects(new DemoProvider().generate(events, period, 'sample', c.signal));
  } finally { await close(app); }
});
test('runtime result boundaries: speakers, refs, counts, tone, text, receipt and project-local research', () => {
  const valid = resultFor({ events, projects: ['komorebi', 'minato', 'tsubame'] });
  for (const change of [
    (v: any) => { v.conversation[0].speaker = 'outside'; },
    (v: any) => { v.conversation[0].role = 'tool'; },
    (v: any) => { v.conversation[0].evidenceRefs = []; },
    (v: any) => { v.conversation[0].evidenceRefs = ['outside']; },
    (v: any) => { v.conversation[0].evidenceRefs = Array(9).fill(events[0].eventId); },
    (v: any) => { v.conversation[0].text = 'x'.repeat(501); },
    (v: any) => { v.conversation[0].tone = 'proven'; },
    (v: any) => { v.conversation = Array(17).fill(v.conversation[0]); },
    (v: any) => { v.receipt.insights = Array(7).fill(v.receipt.insights[0]); },
    (v: any) => { v.receipt.insights[0].tone = 'stage'; },
    (v: any) => { v.receipt.actions[0].evidenceRefs = []; },
    (v: any) => { v.receipt = null; },
  ]) {
    const invalid = structuredClone(valid); change(invalid);
    assert.throws(() => parseResult(invalid, events, period));
  }
  assert.throws(() => parseResearch({ notes: [{ text: 'x', tone: 'fact', evidenceRefs: ['m-improve'] }] }, events.filter(e => e.projectId === 'komorebi')));
  assert.equal(LIMITS.researchTokens * 3 + LIMITS.hostTokens, 6000);
  assert.equal(readConfig({ IZAKAYA_LLM_BASE_URL: 'https://user:pass@example.com/v1', IZAKAYA_LLM_MODEL: 'm' }), undefined);
  assert.equal(readConfig({ IZAKAYA_LLM_BASE_URL: 'http://example.com/v1', IZAKAYA_LLM_MODEL: 'm' }), undefined);
});
