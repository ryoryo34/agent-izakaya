import { parseHistory, selectEvents, validTimestamp, type HistoryEvent, type Period } from './domain.ts';
import { validateEvidence, type Retrospective, type Statement, type ReceiptItem } from './provider.ts';

export const LIMITS = { projects: 3, events: 60, inputBytes: 48 * 1024, responseBytes: 64 * 1024, researchTokens: 1200, hostTokens: 2400, timeoutMs: 20_000 } as const;
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('構造化JSONが不正です。');
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('出力の文字数が不正です。');
  return value;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('出力の項目数が不正です。');
  return value;
}
function item(value: unknown, events: readonly HistoryEvent[], stage = false): ReceiptItem & { tone: Statement['tone'] } {
  const v = object(value);
  const tone = v.tone as Statement['tone'];
  if (!['fact', 'hypothesis', 'suggestion', ...(stage ? ['stage'] : [])].includes(tone)) throw new Error('toneが不正です。');
  const refs = list(v.evidenceRefs, 8).map(r => text(r, 80));
  if ((tone !== 'stage' && !refs.length) || refs.some(id => !events.some(e => e.eventId === id))) throw new Error('根拠IDが選択範囲にないか、空です。');
  return { text: text(v.text, 500), tone, evidenceRefs: refs };
}
export function validateSelection(events: readonly HistoryEvent[], period: Period, projects = [...new Set(events.map(e => e.projectId))]) {
  if (projects.length > LIMITS.projects) throw new Error('LLM生成は最大3プロジェクトです。選択を減らしてください。');
  if (events.length > LIMITS.events || new TextEncoder().encode(JSON.stringify(events)).length > LIMITS.inputBytes) throw new Error('LLM入力は60イベント・48 KiB以下です。選択を減らしてください。');
  if (!validTimestamp(period.start) || !validTimestamp(period.end)) throw new Error('期間が不正です。');
  const selected = selectEvents({ schemaVersion: 1, events: [...events] }, projects, period);
  if (selected.length !== events.length) throw new Error('選択外のイベントがあります。');
}
export function parseRequest(value: unknown) {
  const v = object(value), p = object(v.period);
  const period = { start: text(p.start, 40), end: text(p.end, 40) };
  const events = parseHistory(JSON.stringify({ schemaVersion: 1, events: v.events })).events;
  validateSelection(events, period);
  return { events, period };
}
export function parseResearch(value: unknown, events: readonly HistoryEvent[]) {
  const notes = list(object(value).notes, 6).map(v => item(v, events));
  if (!notes.length) throw new Error('下調べが空です。');
  return { notes };
}
export function parseResult(value: unknown, events: readonly HistoryEvent[], period: Period): Retrospective {
  const v = object(value), receipt = object(v.receipt);
  const projects = [...new Set(events.map(e => e.projectId))];
  const conversation = list(v.conversation, 16).map(value => {
    const s = object(value);
    if (!(s.role === 'host' && s.speaker === 'master') && !(s.role === 'agent' && projects.includes(s.speaker as string))) throw new Error('発言者が選択範囲外です。');
    return { ...item(s, events, true), role: s.role, speaker: s.speaker } as Statement;
  });
  if (conversation.length < 2 || !conversation.some(s => s.role === 'host') || projects.some(p => !conversation.some(s => s.role === 'agent' && s.speaker === p))) throw new Error('会話に大将と選択担当が必要です。');
  const result: Retrospective = { mode: 'llm', period, projects, conversation, receipt: {
    insights: list(receipt.insights, 6).map(v => item(v, events)),
    actions: list(receipt.actions, 6).map(v => item(v, events)),
    unresolved: list(receipt.unresolved, 6).map(v => item(v, events)),
  } };
  if (!Object.values(result.receipt).some(items => items.length)) throw new Error('お会計が空です。');
  validateEvidence(result, events);
  return result;
}
