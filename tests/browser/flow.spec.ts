import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function startAll(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "暖簾をくぐる" }).click();
  await page.getByRole("button", { name: "全表示", exact: true }).click();
}
test("selection → playback/pause → evidence → receipt download → invalidation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external: string[] = [];
  page.on("request", (r) => {
    if (!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(r.url());
  });
  await page.goto("/");
  await expect(page.locator("#count")).toContainText("7 件");
  await page.getByRole("button", { name: "暖簾をくぐる" }).click();
  await expect(page.locator(".message")).toHaveCount(1);
  await expect(page.locator("#download")).toBeDisabled();
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await page.waitForTimeout(2700);
  await expect(page.locator(".message")).toHaveCount(1);
  await page.getByRole("button", { name: "再生", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(2, { timeout: 5000 });
  await page.getByRole("button", { name: "全表示", exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(12);
  await page
    .getByRole("button", { name: "根拠 k-config-1 を開く", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "2026-10-05T00:00:00+09:00",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "設定の読み込みが2回走り",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download").click();
  const download = await downloadPromise;
  const md = await readFile((await download.path())!, "utf8");
  expect(md).toContain("サンプル会話・実AI未接続");
  expect(md).toContain("k-config-2, m-improve");
  expect(md).not.toContain("t-after");
  await page.locator('input[value="minato"]').uncheck();
  await expect(page.locator("#download")).toBeDisabled();
  await expect(page.locator(".message")).toHaveCount(0);
  await startAll(page);
  await expect(page.locator("#messages")).not.toContainText("入口が分かれて");
  await expect(page.locator('[data-evidence="m-improve"]')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("custom boundaries, empty selection, malformed input, unknown history and safe DOM", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#period").selectOption("custom");
  await page.locator("#start").fill("2026-10-10");
  await page.locator("#end").fill("2026-10-11");
  await expect(page.locator("#count")).toContainText("2 件");
  await startAll(page);
  await expect(page.locator("#messages")).not.toContainText("二度読み");
  await page.locator("#end").fill("2026-10-10");
  await expect(page.getByRole("alert")).toContainText("開始日");
  await expect(page.locator("#start-session")).toBeDisabled();
  await page.getByRole("button", { name: "架空サンプル", exact: true }).click();
  for (const checkbox of await page.locator('input[name="project"]').all())
    await checkbox.uncheck();
  await expect(page.locator("#messages")).toContainText("対象なし");
  await page.locator("#start-session").click();
  await expect(page.locator(".message")).toHaveCount(0);
  await expect(page.locator("#receipt-body")).toContainText("対象なし");
  await page.getByRole("button", { name: "JSONを選ぶ", exact: true }).click();
  await page.locator("#json-input").fill("{ broken");
  await page.locator("#load-json").click();
  await expect(page.getByRole("alert")).toContainText("JSONの形式");
  await expect(page.locator("#start-session")).toBeDisabled();
  const text = '<img src=x onerror="alert(1)"> 架空の帳票を整理した。';
  await page
    .locator("#json-input")
    .fill(
      JSON.stringify({
        schemaVersion: 1,
        events: [
          {
            projectId: "new-project",
            sessionId: "s1",
            eventId: "k-config-1",
            timestamp: "2026-10-06T10:00:00+09:00",
            kind: "achievement",
            text,
          },
        ],
      }),
    );
  await page.locator("#load-json").click();
  await startAll(page);
  await expect(page.locator("#mode-note")).toContainText("引用テンプレート");
  await expect(page.locator("#messages")).toContainText(text);
  await expect(page.locator("#messages img")).toHaveCount(0);
  await expect(page.locator("#messages")).not.toContainText("二度読み");
  await page.locator('[data-evidence="k-config-1"]').first().click();
  await expect(page.getByRole("dialog")).toContainText("new-project");
});
test("file import, today/week selection, oversized and empty files", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-10T18:00:00+09:00") });
  await page.goto("/");
  await page.locator("#period").selectOption("today");
  await expect(page.locator("#count")).toContainText("2 件");
  await page.locator("#period").selectOption("week");
  await expect(page.locator("#count")).toContainText("7 件");
  await page.getByRole("button", { name: "JSONを選ぶ", exact: true }).click();
  await page
    .locator("#file")
    .setInputFiles({
      name: "big.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(1048577, "x"),
    });
  await expect(page.getByRole("alert")).toContainText("1 MiB");
  await expect(page.locator("#start-session")).toBeDisabled();
  await page
    .locator("#file")
    .setInputFiles({
      name: "empty.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":1,"events":[]}'),
    });
  await expect(page.locator("#messages")).toContainText("対象なし");
  await expect(page.locator("#source-note")).toContainText("引用テンプレート");
  await expect(page.getByRole("alert")).not.toBeVisible();
});
test("mobile stays within viewport and key actions remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await startAll(page);
  await expect(page.locator("#download")).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator('[data-evidence="t-open"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "根拠を閉じる" }).click();
  await page.screenshot({
    path: "test-results/mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("desktop visual checkpoint", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await startAll(page);
  await page.screenshot({
    path: "test-results/desktop.png",
    fullPage: true,
    animations: "disabled",
  });
});
