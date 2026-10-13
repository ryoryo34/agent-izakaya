import { test, expect } from '@playwright/test';

for (const [width, height] of [[1280, 800], [850, 850], [390, 844]]) {
  test(`one-click entry, evidence return and receipt at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#llm-notice')).toBeHidden();
    await expect(page.locator('#start-session')).toBeInViewport();
    await page.locator('#start-session').press('Enter');
    await expect(page.locator('#conversation-heading')).toBeFocused();
    await page.locator('#show-all').click();
    const evidence = page.locator('#messages [data-evidence="k-config-1"]').first();
    await evidence.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(evidence).toBeFocused();
    await page.locator('#to-receipt').click();
    await expect(page.locator('#receipt-heading')).toBeFocused();
    await expect(page.locator('.first-action')).toContainText('呼び出し元');
    await expect(page.locator('.receipt-section').first().locator('.receipt-item')).toHaveCount(2);
    const receiptEvidence = page.locator('.first-action [data-evidence="m-improve"]');
    await receiptEvidence.click();
    await page.locator('#return-evidence').click();
    await expect(receiptEvidence).toBeFocused();
    await page.locator('#review').click();
    await expect(page.locator('#conversation-heading')).toBeFocused();
    expect(await page.locator('#messages').evaluate(e => e.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.message').first().evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  });
}

test('reading older messages is not interrupted; evidence pauses and replay keeps the same receipt', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.locator('#start-session').click();
  await page.clock.runFor(5 * 2400);
  await expect(page.locator('.message')).toHaveCount(6);
  await page.locator('#messages').evaluate(e => { e.scrollTop = 0; });
  await page.clock.runFor(2400);
  await expect(page.locator('.message')).toHaveCount(7);
  expect(await page.locator('#messages').evaluate(e => e.scrollTop)).toBe(0);
  await expect(page.locator('#latest')).toBeVisible();
  await page.locator('#messages [data-evidence]').first().click();
  await page.clock.runFor(4800);
  await expect(page.locator('.message')).toHaveCount(7);
  await page.locator('#return-evidence').click();
  await expect(page.locator('#play')).toHaveText('再生');
  await page.locator('#latest').click();
  await expect(page.locator('#latest')).toBeHidden();
  await page.locator('#play').click();
  await page.clock.runFor(2400);
  await expect(page.locator('.message')).toHaveCount(8);
  await page.locator('#show-all').click();
  const receipt = await page.locator('#receipt-body').innerHTML();
  await page.locator('#replay').click();
  await expect(page.locator('.message')).toHaveCount(1);
  await page.locator('#show-all').click();
  expect(await page.locator('#receipt-body').innerHTML()).toBe(receipt);
});

test('LLM replay issues no generation request even after selecting another mode', async ({ page }) => {
  let requests = 0;
  page.on('request', r => { if (r.url().endsWith('/api/generate')) requests++; });
  await page.goto('/');
  await page.locator('#settings summary').click();
  await page.locator('#generation-mode').selectOption('llm');
  await expect(page.locator('#destination')).toContainText('fictional-stub');
  await expect(page.locator('#llm-notice')).toContainText('金額の上限ではなく');
  await page.locator('#start-session').click();
  await expect(page.locator('#generation-status')).toHaveText('生成完了');
  await page.locator('#show-all').click();
  const receipt = await page.locator('#receipt-body').innerHTML();
  const messages = await page.locator('#messages').innerHTML();
  await page.locator('#settings summary').click();
  await page.locator('#generation-mode').selectOption('demo');
  await page.locator('#replay').click();
  await page.locator('#show-all').click();
  expect(requests).toBe(1);
  expect(await page.locator('#receipt-body').innerHTML()).toBe(receipt);
  expect(await page.locator('#messages').innerHTML()).toBe(messages);
  await expect(page.locator('#mode-note')).toContainText('LLM生成');
});
