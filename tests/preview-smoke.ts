import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createStub, listen, close } from './support/stub.ts';

const stub = createStub();
const upstream = await listen(stub.server);
process.env.IZAKAYA_LLM_BASE_URL = upstream + '/v1';
process.env.IZAKAYA_LLM_MODEL = 'fictional-preview-stub';
process.env.IZAKAYA_LLM_API_KEY = 'fictional-test-key-never-in-client';
const { preview } = await import('vite');
let app: Awaited<ReturnType<typeof preview>> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  app = await preview({ preview: { host: '127.0.0.1', port: 4315, strictPort: true } });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHROME ? 'chrome' : undefined });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4315/');
  await page.locator('#destination').filter({ hasText: 'fictional-preview-stub' }).waitFor();
  await page.locator('#generation-mode').selectOption('llm');
  await page.locator('#start-session').click();
  await page.locator('#generation-status').filter({ hasText: '生成完了' }).waitFor();
  await page.locator('#show-all').click();
  assert.equal(stub.calls.length, 4);
  const previous = await page.locator('#messages').innerHTML();
  await page.locator('[data-evidence]').first().click();
  assert.equal(await page.locator('#evidence-dialog').isVisible(), true);
  await page.keyboard.press('Escape');
  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  const markdown = await readFile((await (await download).path())!, 'utf8');
  assert.match(markdown, /LLM生成/);
  assert.match(markdown, /fictional/);
  // Exercise browser disconnect all the way to the real upstream HTTP socket.
  stub.setMode('slow');
  await page.locator('#start-session').click();
  for (let i = 0; i < 100 && stub.calls.length < 5; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(stub.calls.length, 5);
  await page.locator('#cancel-generation').click();
  await page.locator('#generation-status').filter({ hasText: 'キャンセル' }).waitFor();
  for (let i = 0; i < 100 && !stub.disconnected; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(stub.disconnected, 1);
  assert.equal(stub.calls.length, 5);
  assert.equal(await page.locator('#messages').innerHTML(), previous);
  assert.equal(await page.locator('#download').isEnabled(), true);
  for (const name of await readdir('dist/assets')) {
    const text = await readFile(`dist/assets/${name}`, 'utf8');
    assert.ok(!text.includes(process.env.IZAKAYA_LLM_API_KEY));
    assert.ok(!text.includes('IZAKAYA_LLM_API_KEY'));
  }
  assert.deepEqual(errors, []);
  console.log('Production preview: LLM HTTP flow, evidence/download, real socket cancellation, prior result preservation, no client key, zero JS errors: passed.');
} finally {
  await browser?.close();
  if (app) await new Promise<void>(resolve => app!.httpServer.close(() => resolve()));
  await close(stub.server);
}
