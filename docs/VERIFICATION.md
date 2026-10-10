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
