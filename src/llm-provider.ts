import type { HistoryEvent, Period } from './domain.ts';
import type { Retrospective, RetrospectiveProvider } from './provider.ts';
import { validateSelection } from './llm-contract.ts';

export class LlmProvider implements RetrospectiveProvider {
  async generate(events: readonly HistoryEvent[], period: Period, _source: 'sample' | 'import', signal?: AbortSignal): Promise<Retrospective> {
    validateSelection(events, period);
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events, period }), signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || '生成に失敗しました。');
    return body as Retrospective;
  }
}
