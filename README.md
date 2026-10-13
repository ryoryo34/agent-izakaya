# Agent Izakaya

[English](./README.md) | [日本語](./README.ja.md)

A local-first izakaya retrospective where project agents share stories grounded in selected session history.

![The fictional agents at the counter](docs/demo.png)

## Status

The first runnable demo is available. **Sample conversation · no real AI connected.** A deterministic `DemoProvider` stages a conversation between three fictional project agents and the host. Character voices and jokes are theatrical, not an AI's inner thoughts.

An optional **LLM mode** now runs project research followed by a host conversation and receipt through a loopback Node backend. The OpenAI-compatible HTTP path is tested with a local stub; **real models and billing have not been exercised**. Demo still needs no API key or external service. Codex/Claude history adapters, user participation, and long-term memory remain future work.

## Run locally

Requires **Node.js 22.18+** and npm. From a checkout:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:4312/>. The server binds to loopback and fails if port 4312 is occupied; it does not stop another server. Use `npm run dev -- --port 4313` to choose a different port.

```sh
npm run build
npm run preview
```

The preview serves the production build on the same port, so stop the dev server first. Package installation requires network access. Demo runs without external requests, storage, analytics, fonts, or APIs; LLM mode sends selected records only when you explicitly generate. A page reload clears imported data and the current conversation.

## Try one evening

1. Click **暖簾をくぐる** (enter). The fictional projects and fixed demo week are already selected; no setup or API key is needed. **記録・期間・生成モードを変更** expands the optional selection controls.
2. Read a statement every 2.4 seconds, with the latest speaker and progress shown above the conversation. Use **一時停止** (pause), **再生** (resume), or **全表示** (show all). Reading older messages holds your scroll position; **最新の発言へ** returns to the latest.
3. Click an evidence ID to see its original text, project, session, timestamp and kind. Opening evidence pauses playback. Escape, × or **元の発言・項目に戻る** closes it and restores focus to the originating button; resume when ready.
4. After the conversation, use **明日の一手へ** to reach the receipt. Its first proposal is highlighted as **まず一つ**. The built-in demo consolidates the repeated configuration issue into one evidenced proposal. Other findings and open items remain available. Save the Markdown receipt with its mode, period and evidence IDs.
5. **会話を見直す** returns to the transcript; **同じ会話を再生** replays the completed result without generating or sending anything, including in LLM mode. It preserves the receipt and provenance. Only **選択記録を送信してLLM生成** performs a new LLM generation.

Demo shows only relevant guidance. Selecting LLM exposes the destination/model, selected scope, request bounds and cost/cancellation notice before sending. The first LLM proposal stays in the model's original order and wording; highlighting it does not establish a new priority or verified fact. Imported Demo histories remain literal templates, with a first record-order confirmation candidate.

See the [three-scenario experience evaluation and before/after screenshots](docs/EXPERIENCE.md).
Changing projects, periods, or input clears the old conversation, evidence, and receipt. An empty selection shows **対象なし** (no matching history), without invented conversation; an empty receipt can still be saved after entering.

A generated example is available in [sample-receipt.md](docs/sample-receipt.md).

### Sample and periods

[demo.json](public/fixtures/demo.json) contains only invented events from `komorebi`, `minato`, and `tsubame`: repeated configuration reads, another project's consolidation example, and an unstable search test. No personal or business history was collected. The fixed demo week is **2026-10-05 00:00 through 2026-10-12 00:00, Asia/Tokyo** and remains available after the actual date changes.

All periods are **start-inclusive, end-exclusive** in **Asia/Tokyo (UTC+09:00)**. Today and this week use the current date in Tokyo; weeks start on Monday. Custom end dates are excluded. Imported timestamps are compared as instants, including their offsets. Events just before, at, and just after the week boundary demonstrate filtering. A different current week may have no sample events; choose the fixed demo week to replay the demo.

## Normalized JSON input

Expand **記録・期間・生成モードを変更**, then use **JSONを選ぶ** to select a local JSON file or paste JSON. Import and selection happen in browser memory. In LLM mode, explicit generation transmits the selected events to the displayed endpoint through the backend. Use fictional records when experimenting with this public demo.

```json
{
  "schemaVersion": 1,
  "events": [
    {
      "projectId": "fictional-project",
      "sessionId": "session-1",
      "eventId": "event-1",
      "timestamp": "2026-10-10T18:00:00+09:00",
      "kind": "achievement",
      "text": "A fictional project's test passed."
    }
  ]
}
```

- `projectId`, `sessionId`, `eventId`: 1–80 ASCII characters, starting with a letter or digit, followed by letters, digits, `.`, `_`, or `-`. `eventId` must be unique across the entire input.
- `timestamp`: a real calendar datetime with seconds and an explicit `Z` or numeric offset; optional 1–3 fractional-second digits. Offset range: −14:00 to +14:00. Leap seconds are unsupported.
- `kind`: `achievement`, `problem`, `improvement`, or `unresolved`.
- `text`: non-blank, 1–4,000 UTF-16 code units. Extra fields are discarded; they cannot provide scripts or instructions.
- Limits: **1 MiB UTF-8**, **300 events**, **20 projects**. Invalid JSON, missing/invalid fields, duplicate IDs, and exceeded limits produce visible errors. An error blocks entry until corrected or the sample is restored. `events: []` is valid.

`src/domain.ts` defines and validates the schema. Conversation statements and receipt items use `evidenceRefs: string[]`, resolving only to the selected events. Missing references fail validation and export. Imported text is displayed as text; Markdown metacharacters are escaped in receipts.

**In Demo mode, imported input always uses short quotation templates, never sample-specific facts or LLM inference**, even if it reuses sample IDs or the entire sample file. Built-in scripts require exact fixture content and all evidence for each statement. Cross-project suggestions disappear when a required event is filtered out. Hypotheses and suggestions are explicitly labeled; they are not reported as proven causes or completed fixes.

## Optional LLM mode

Configure only the server process, then restart `npm run dev` (or `npm run preview` after building):

```sh
export IZAKAYA_LLM_BASE_URL="https://api.openai.com/v1"
export IZAKAYA_LLM_MODEL="your-compatible-model"
# Supply IZAKAYA_LLM_API_KEY through your shell's secret mechanism.
# Never use a VITE_ variable, browser input, source file, or committed key.
npm run dev
```

`IZAKAYA_LLM_BASE_URL` is a base URL; the backend appends `/chat/completions`. Remote endpoints require HTTPS; HTTP is allowed only for localhost/loopback services. URL credentials, query strings and fragments are rejected. Model and base URL are required; `IZAKAYA_LLM_API_KEY` is optional for keyless local services. Configuration comes from the process environment, **not automatically from `.env`**. Missing/invalid configuration disables LLM generation while Demo remains usable. The browser receives only endpoint/model/limits; there is no editable endpoint or key field.

Expand **記録・期間・生成モードを変更**, choose **LLM**, review the displayed destination/model, selected projects and Tokyo period, then click **選択記録を送信してLLM生成**. Importing a file or switching mode does not send histories. Each agent receives only its selected project events; the host receives those bounded research notes and all selected evidence. Result/receipt labels distinguish `fact`, `hypothesis`, `suggestion`, and theatrical `stage` speech. A valid evidence ID proves only that the record is in scope, **not that a model's claim is true**. Inspect the original text before acting on suggestions. No tools are exposed and history instructions are treated as data; prompts cannot guarantee semantic immunity to injection.

| Bound per explicit generation | Limit |
| --- | --- |
| Selected projects / events / serialized event input | 3 / 60 / 48 KiB UTF-8 |
| Upstream calls | One per nonempty project, then one host call; **maximum 4**, sequential; empty input = 0 |
| Retries / redirects / concurrent jobs | None / rejected / one per app server |
| Requested output token caps | 1,200 per researcher + 2,400 host = maximum 6,000; `max_completion_tokens` |
| Timeout / upstream response size | 20 seconds per call including body (up to 80 seconds total); 64 KiB each; upload timeout 10 seconds |
| Structured result | 2–16 statements; 1–500 UTF-16 units per text; ≤6 items per receipt section; ≤8 evidence IDs per item |

The model must support Chat Completions with `response_format: {type: "json_object"}`, `max_completion_tokens`, and system messages. JSON mode alone does not ensure schema compliance: runtime checks reject malformed JSON, invalid speakers/tones/references, missing evidence on non-stage items, oversized results, refusals, tool calls and incomplete responses. There is no silent Demo fallback or automatic retry. An unsupported provider/model fails visibly; compatibility has **not** been verified against real services.

Usage is the sum of provider-reported prompt/completion/total tokens only when all calls report valid usage; otherwise it is **unavailable**, not an estimate. Markdown retains LLM mode, requested model, endpoint, timestamp, call count and usage. Input is sent once for research and again with research notes to the host; 48 KiB is the selected-event limit, not cumulative transfer or a token budget. These are request limits, **not a monetary cap**; service pricing and enforcement vary. Cancellation/timeout abort the connection and stop later calls but cannot guarantee a remote provider stops processing or charging an already accepted request. A new manual generation can incur a new set of calls.

Generation states are visible. Failure/cancellation keep the prior completed conversation and receipt; successful generation replaces them. Changing source/projects/period clears the old scope. Selection is locked during generation, with a cancel button available. The backend rejects unapproved Host/Origin and cross-site API requests, requires same-origin JSON POST, never returns provider error bodies, and does not log or persist keys/histories/results. Provider-side retention depends on the configured service.

### Try the HTTP path without an API key or charges

```sh
node tests/browser-server.ts
```

Open <http://127.0.0.1:4314/>, choose LLM, and generate. This starts Vite plus a fictional local HTTP stub, temporarily replacing LLM configuration **only in this process**. The generated content is fixed test output, not real inference. Ctrl-C stops both servers. `npm test` also exercises real loopback HTTP with ephemeral ports; no internet/model account is needed. `PLAYWRIGHT_CHROME=1 npm run test:e2e` covers browser → backend → stub, evidence and receipt; error/cancel UI tests use browser response mocks, while backend timeout/cancellation tests use real sockets.

## Development and verification

The app uses TypeScript and the [Vite vanilla workflow](https://vite.dev/guide/), with no runtime libraries. Native DOM rendering keeps the first demo small; [Node's test runner](https://nodejs.org/api/test.html) covers domain behavior and [Playwright](https://playwright.dev/docs/intro) covers browser operations. Dependencies are locked in `package-lock.json`.

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:preview # after npm run build
```

For an already installed Google Chrome: `PLAYWRIGHT_CHROME=1 npm run test:e2e`. Browser tests start an isolated Vite server on port **4314** with a local HTTP stub on an ephemeral loopback port. They fail if 4314 is occupied and never reuse another server. The production build is in `dist/`.

Tests cover Tokyo midnight/Monday/year boundaries, offset equivalence, exclusive endpoints, every project subset, empty/malformed/oversized input, unknown-history isolation, missing evidence, safe DOM/Markdown rendering, replay controls, receipt downloads, stale-state reset, and mobile overflow. See [verification notes](docs/VERIFICATION.md) for the implementation-session results.

Architecture: `domain.ts` handles input/time selection; `provider.ts` exposes asynchronous, cancellable `RetrospectiveProvider`, Demo generation and Markdown output; `llm-contract.ts` validates bounded results; `llm-provider.ts` calls the same-origin API; `server/llm.ts` handles research/host prompts and upstream HTTP; `server/api.ts` handles loopback request security and cancellation; `main.ts` manages ephemeral UI state. Vite attaches the Node API in both dev and preview; serving `dist/` alone provides Demo only. Tokyo is the sole reference timezone. This demo does not infer whether later events resolved earlier problems. Demo quotes imported histories; only LLM mode attempts analysis, whose meaning must be checked against the original evidence.

See [vision](docs/VISION.md), [workflow](docs/WORKFLOW.md), and [issues](https://github.com/ryoryo34/agent-izakaya/issues). One issue corresponds to one Codex session and one implementation branch. Issue #3 adds the optional LLM path on top of Issue #1. Deployment and CLI history adapters remain out of scope.

## License

[MIT](LICENSE). The counter illustration is original CSS; no third-party image assets are used.
