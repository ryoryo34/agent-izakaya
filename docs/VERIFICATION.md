# Issue #1 verification / 検証記録

Implementation scope: [Issue #1](https://github.com/ryoryo34/agent-izakaya/issues/1). All test input is fictional. No private or business histories were read.

## Environment

- macOS, Node.js 25.4.0, npm 11.7.0
- Vite 8.3.4, TypeScript 7.0.2, Playwright 1.64.0
- Installed Google Chrome, desktop 1440 × 1100 and mobile viewport 390 × 844
- Verification date: 2026-10-10 (Asia/Tokyo)

## Results

| Check | Result |
| --- | --- |
| `npm test` | 15 passed |
| `npm run typecheck` | Passed |
| `PLAYWRIGHT_CHROME=1 npm run test:e2e` | 5 passed |
| `npm run build` | Passed; static assets in `dist/` |
| Production preview smoke | HTTP 200; 12 statements; evidence and Markdown download; zero JS errors |
| Local HTTP check | 200 on 127.0.0.1:4312 |
| Runtime outbound requests during browser flow | None |
| Browser JavaScript errors during main flow | None |
| Desktop and mobile screenshots | Inspected; no horizontal overflow at 390px |

Domain tests cover Tokyo midnight, Monday and year boundaries, offset-equivalent instants, inclusive start/exclusive end, fixed demo dates, custom range errors, duplicate IDs, limits, impossible timestamps, empty selection, deterministic output, all project subsets, narrow-period isolation, unknown input with copied sample IDs, missing evidence, Markdown escaping, and a project named `master` remaining distinct from the host.

Browser tests cover selection, timed replay, pause/resume, show-all, evidence dialog/Escape, receipt download and content, changing selection after completion, custom/today/week filtering, empty selection, JSON errors, arbitrary input without script injection, file import/size limits, and mobile operation.

## Limits / 制約

- Real LLMs, CLI adapters, API billing, hosting/deployment, live voice, participation, and long-term memory were not implemented or exercised; these remain separate future issues.
- All date filtering is based on Asia/Tokyo. Arbitrary history is quoted, not semantically analyzed. Open items reflect event kinds, not inferred current resolution.
- Chrome was exercised; other browser engines and physical mobile devices were not tested.
- Tests ran on Node 25.4.0; the documented minimum is Node 22.18 for native TypeScript stripping.
- Imports remain in browser memory. They are not persisted, executed, or transmitted.

# Issue #3 verification / 検証記録

Scope: [Issue #3](https://github.com/ryoryo34/agent-izakaya/issues/3), stacked on [PR #2](https://github.com/ryoryo34/agent-izakaya/pull/2), parent commit `531ddf062456425ebb7e0bf4055b7c1ed501e193`. Verified 2026-10-10, same Node/Chrome environment as above. All history, model responses and test keys are fictional. No real histories, secrets, paid APIs, deployment or account-setting changes were used.

| Check | Result |
| --- | --- |
| `npm test` | 21 passed: 15 existing domain + 6 LLM/integration tests |
| `npm run typecheck` | Passed, including server and tests |
| `PLAYWRIGHT_CHROME=1 npm run test:e2e` | 8 passed: 5 existing + 3 LLM browser tests |
| `npm run build` | Passed with a fictional secret sentinel in server environment; absent from build assets |
| `PLAYWRIGHT_CHROME=1 npm run test:preview` | Passed: production HTTP flow, evidence/download, actual browser disconnect reaching upstream, prior-result retention and zero JS errors |
| Desktop + 390px mobile LLM screenshots | Inspected; no horizontal overflow |
| Browser JavaScript errors | None during LLM flow |
| API key disclosure | Fictional key present only in stub Authorization; absent from client scripts, DOM, config/result JSON and Markdown |
| External model calls / charges | None; all model requests use local HTTP stub |

Real socket integration exercises researcher → host → validated conversation/receipt; all three researchers receive only their own selected records, host receives only selected evidence and research, excluded dates/projects stay out, at most four requests occur, empty selection makes zero calls. It verifies input/project caps, forbidden/missing/null Origin and Host, single concurrent generation, malformed envelope/model JSON, missing evidence, excessive response bytes/text, HTTP error body suppression, refused redirects, unfinished output, tool calls, timeout, slow response-body timeout, final host validation failure after exactly four calls, and cancellation propagation to upstream sockets with no later calls or retries. Missing usage is unknown; no estimates are displayed.

Runtime contract tests additionally mutate speakers, roles, tones, references, empty evidence, statement/receipt counts and receipt structure. Evidence validation checks membership, **not semantic truth**. Stage speech must be theatrical by prompt; it is not a semantic classifier. Prompts keep history as untrusted data and expose no tools, but are not a proof of immunity to instruction injection.

Browser success goes through Vite → Node API → local HTTP stub. Browser failure/cancel UI tests use mocked responses to check previous-result preservation; cancellation over real sockets is covered separately in integration tests. Tests use their own port 4314, reject an occupied port and do not reuse or stop other servers. Vite reports its existing warning about the sample JSON import from `public/`; all regression checks pass.

Implementation uses built-in Node HTTP/fetch without adding dependencies. On 2026-10-10, the [Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) was checked for JSON mode, `max_completion_tokens`, finish reasons and usage. [openai-node](https://github.com/openai/openai-node) is Apache-2.0 and [AIRI](https://github.com/moeru-ai/airi) is MIT; neither code/assets nor dependencies were copied. Local runtime validation follows JSON mode because compatible services vary in JSON Schema support. No automatic parameter fallback or retries are attempted.

## Issue #3 limits / 未確認事項

- Real providers/models, response quality, actual token usage, monetary billing and upstream cancellation behavior are **not verified**. Stub usage numbers are fictional. The UI/receipt's model is the configured/requested model, not a verified server identity.
- Service support for JSON mode, system messages and `max_completion_tokens` is required; incompatible models fail visibly. Request caps are not a monetary budget, and timeout/cancel cannot undo accepted upstream work or charges.
- Chrome desktop/mobile viewport only; other browser engines, physical devices and Node 22.18 minimum were not exercised.
- Node backend exists in both Vite dev and preview. Static hosting of `dist/` alone cannot perform LLM generation. No deployment was done.
- Demo remains deterministic and keyless. Existing Issue #1 limits above describe that earlier milestone; Issue #3 now adds the optional HTTP path and explicit selected-history transmission.

# Issue #5 verification / 検証記録

2026-10-14 JST。Scope: [Issue #5](https://github.com/ryoryo34/agent-izakaya/issues/5)。親PR #4の `87e096bd88b206202c3b41e5adf2ef5db1e26ce2` から `issue-5-experience-polish` を作成。開始時clean。架空fixtureのみ使用し、実モデル・課金・秘密/実履歴探索・ユーザー設定変更・デプロイ・マージなし。依存追加なし。

| 確認 | 結果 |
| --- | --- |
| `npm test` | 22 passed。既存21件＋Demo提案統合・範囲・任意入力の非統合 |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `PLAYWRIGHT_CHROME=1 npm run test:e2e` | 13 passed。既存8件＋3viewport操作・読み返し保持/根拠停止・LLM再生の追加通信ゼロ |
| `PLAYWRIGHT_CHROME=1 npm run test:preview` | Passed。HTTPスタブ生成・根拠/保存・実ソケットキャンセル・前結果保持・キー非露出・JSエラー0 |
| 実画面 | Codex内蔵ブラウザ、1280×800 / 850×850 / 390×844。入店→会話→根拠→復帰→伝票、手動3シナリオを確認 |
| アクセシビリティ関連 | Chrome E2E: Enterで入店、Escape/戻るで元ボタンへfocus、会話/伝票の見出しfocus、reduced motionでanimationなし、3サイズで横溢れなし |
| 再生と生成の分離 | LLM完成後にDemoへ切り替えて同じ会話を再生しても、生成APIは初回の1回のみ。会話・伝票・LLM生成情報は同一 |
| 回帰 | 空入力、無効JSON、任意JSON、期間/担当変更、LLM成功/失敗/キャンセル、選択範囲、Markdown provenanceを保持 |

評価表、改善前後の画像、再現手順、未確認事項は [EXPERIENCE.md](EXPERIENCE.md)。内蔵ブラウザの保存完了イベントはtimeoutしたため、その環境の保存完了は未確認。Chromeでは伝票内容まで確認済み。実LLMの品質は未評価。実装の基盤・通信経路は親Issueのまま。
