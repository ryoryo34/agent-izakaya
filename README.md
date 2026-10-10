# Agent Izakaya

[English](./README.md) | [日本語](./README.ja.md)

A local-first izakaya retrospective where project agents share stories grounded in selected session history.

![The fictional agents at the counter](docs/demo.png)

## Status

The first runnable demo is available. **Sample conversation · no real AI connected.** A deterministic `DemoProvider` stages a conversation between three fictional project agents and the host. Character voices and jokes are theatrical, not an AI's inner thoughts.

Real LLM inference, Codex/Claude history adapters, user participation, and long-term memory are future work. No API key, external log connection, or runtime network service is required.

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

The preview serves the production build on the same port, so stop the dev server first. Package installation requires network access; the running app works locally without external requests, storage, analytics, fonts, or APIs. A page reload clears imported data and the current conversation.

## Try one evening

1. Keep **架空サンプル** (fictional sample) and the fixed **デモの一週間** (demo week), select the projects, and click **暖簾をくぐる** (enter).
2. Watch a statement appear every 2.4 seconds. Use **一時停止** (pause), **再生** (resume), or **全表示** (show all).
3. Click an evidence ID under a statement to see its original text, project, session, timestamp, and kind. Press Escape or × to close.
4. After the conversation, inspect **持ち帰る知見** (insights), **明日の一手** (suggested next steps), and **積み残し** (open items as recorded). Save the Markdown receipt, including the sample label, period, and evidence IDs.

Changing projects, periods, or input clears the old conversation, evidence, and receipt. An empty selection shows **対象なし** (no matching history), without invented conversation; an empty receipt can still be saved after entering.

A generated example is available in [sample-receipt.md](docs/sample-receipt.md).

### Sample and periods

[demo.json](public/fixtures/demo.json) contains only invented events from `komorebi`, `minato`, and `tsubame`: repeated configuration reads, another project's consolidation example, and an unstable search test. No personal or business history was collected. The fixed demo week is **2026-10-05 00:00 through 2026-10-12 00:00, Asia/Tokyo** and remains available after the actual date changes.

All periods are **start-inclusive, end-exclusive** in **Asia/Tokyo (UTC+09:00)**. Today and this week use the current date in Tokyo; weeks start on Monday. Custom end dates are excluded. Imported timestamps are compared as instants, including their offsets. Events just before, at, and just after the week boundary demonstrate filtering. A different current week may have no sample events; choose the fixed demo week to replay the demo.

## Normalized JSON input

Use **JSONを選ぶ** to select a local JSON file or paste JSON. It is processed only in browser memory. Use fictional records when experimenting with this public demo.

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

**Imported input always uses short quotation templates, never sample-specific facts or LLM inference**, even if it reuses sample IDs or the entire sample file. Built-in scripts require exact fixture content and all evidence for each statement. Cross-project suggestions disappear when a required event is filtered out. Hypotheses and suggestions are explicitly labeled; they are not reported as proven causes or completed fixes.

## Development and verification

The app uses TypeScript and the [Vite vanilla workflow](https://vite.dev/guide/), with no runtime libraries. Native DOM rendering keeps the first demo small; [Node's test runner](https://nodejs.org/api/test.html) covers domain behavior and [Playwright](https://playwright.dev/docs/intro) covers browser operations. Dependencies are locked in `package-lock.json`.

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

For an already installed Google Chrome: `PLAYWRIGHT_CHROME=1 npm run test:e2e`. Browser tests can reuse the running dev server; otherwise they start it. The production build is in `dist/`.

Tests cover Tokyo midnight/Monday/year boundaries, offset equivalence, exclusive endpoints, every project subset, empty/malformed/oversized input, unknown-history isolation, missing evidence, safe DOM/Markdown rendering, replay controls, receipt downloads, stale-state reset, and mobile overflow. See [verification notes](docs/VERIFICATION.md) for the implementation-session results.

Architecture: `domain.ts` handles input and time selection; `provider.ts` exposes `RetrospectiveProvider`, deterministic generation, reference validation, and Markdown output; `main.ts` handles ephemeral UI state. Tokyo is the sole reference timezone. This demo does not infer whether later events resolved earlier problems. The imported-history UI can quote up to the input limits; it does not summarize or analyze them.

See [vision](docs/VISION.md), [workflow](docs/WORKFLOW.md), and [issues](https://github.com/ryoryo34/agent-izakaya/issues). One issue corresponds to one Codex session and one implementation branch. Deployment, real LLM integration, and CLI history adapters are outside Issue #1.

## License

[MIT](LICENSE). The counter illustration is original CSS; no third-party image assets are used.
