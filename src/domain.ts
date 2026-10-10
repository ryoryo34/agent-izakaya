export const MAX_INPUT_BYTES = 1_048_576;
export const TIME_ZONE = "Asia/Tokyo";
export const KINDS = [
  "achievement",
  "problem",
  "improvement",
  "unresolved",
] as const;
export type EventKind = (typeof KINDS)[number];
export interface HistoryEvent {
  projectId: string;
  sessionId: string;
  eventId: string;
  timestamp: string;
  kind: EventKind;
  text: string;
}
export interface History {
  schemaVersion: 1;
  events: HistoryEvent[];
}
export interface Period {
  start: string;
  end: string;
}
export type PeriodPreset = "demo" | "today" | "week" | "custom";
export const DEMO_PERIOD: Period = {
  start: "2026-10-05T00:00:00+09:00",
  end: "2026-10-12T00:00:00+09:00",
};
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

// Reject calendar rollover and timestamps without an explicit offset before Date.parse.
export function validTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!match) return false;
  const [, y, m, d, h, min, sec, offset] = match;
  const year = Number(y),
    month = Number(m),
    day = Number(d);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1000 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= days[month - 1] &&
    Number(h) < 24 &&
    Number(min) < 60 &&
    Number(sec) < 60 &&
    (offset === "Z" ||
      (Number(offset.slice(1, 3)) <= 14 &&
        Number(offset.slice(4)) < 60 &&
        (Number(offset.slice(1, 3)) < 14 || Number(offset.slice(4)) === 0))) &&
    Number.isFinite(Date.parse(value))
  );
}

export function parseHistory(raw: string): History {
  if (new TextEncoder().encode(raw).length > MAX_INPUT_BYTES)
    throw new Error("JSONは1 MiB以下にしてください。");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("JSONの形式が不正です。括弧やカンマを確認してください。");
  }
  if (
    !data ||
    typeof data !== "object" ||
    !("schemaVersion" in data) ||
    data.schemaVersion !== 1 ||
    !("events" in data) ||
    !Array.isArray(data.events)
  )
    throw new Error("schemaVersion: 1 と events 配列が必要です。");
  if (data.events.length > 300)
    throw new Error("イベントは300件以下にしてください。");
  const ids = new Set<string>();
  const projects = new Set<string>();
  const events = data.events.map((item: unknown, index): HistoryEvent => {
    const fail = (detail: string): never => {
      throw new Error(`events[${index}]: ${detail}`);
    };
    if (!item || typeof item !== "object")
      return fail("イベントはオブジェクトにしてください。");
    const e = item as Record<string, unknown>;
    for (const key of ["projectId", "sessionId", "eventId"]) {
      if (typeof e[key] !== "string" || !ID.test(e[key]))
        fail(`${key} は英数字・._- の1〜80文字が必要です。`);
    }
    if (!validTimestamp(e.timestamp))
      fail(
        "timestamp は実在する日時とoffsetが必要です（例: 2026-10-10T18:00:00+09:00）。",
      );
    if (!KINDS.includes(e.kind as EventKind))
      fail(`kind は ${KINDS.join(" / ")} のいずれかです。`);
    if (typeof e.text !== "string" || !e.text.trim() || e.text.length > 4000)
      fail("text は空白以外を含む1〜4000文字が必要です。");
    if (ids.has(e.eventId as string))
      fail("eventId は履歴全体で一意にしてください。");
    ids.add(e.eventId as string);
    projects.add(e.projectId as string);
    return {
      projectId: e.projectId as string,
      sessionId: e.sessionId as string,
      eventId: e.eventId as string,
      timestamp: e.timestamp as string,
      kind: e.kind as EventKind,
      text: e.text as string,
    };
  });
  if (projects.size > 20)
    throw new Error("プロジェクトは20件以下にしてください。");
  return { schemaVersion: 1, events };
}

const jstDate = (date: Date) =>
  new Date(date.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
export function getPeriod(
  preset: PeriodPreset,
  now = new Date(),
  custom?: { start: string; end: string },
): Period {
  if (preset === "demo") return { ...DEMO_PERIOD };
  if (preset === "custom") {
    const start = `${custom?.start}T00:00:00+09:00`,
      end = `${custom?.end}T00:00:00+09:00`;
    if (
      !validTimestamp(start) ||
      !validTimestamp(end) ||
      Date.parse(start) >= Date.parse(end)
    ) {
      throw new Error("開始日より後の終了日（含まない）を指定してください。");
    }
    return { start, end };
  }
  const midnight = new Date(`${jstDate(now)}T00:00:00+09:00`);
  if (preset === "week") {
    const weekday = new Date(midnight.getTime() + 9 * 3600_000).getUTCDay();
    midnight.setTime(midnight.getTime() - ((weekday + 6) % 7) * 86400_000);
  }
  return {
    start: `${jstDate(midnight)}T00:00:00+09:00`,
    end: `${jstDate(new Date(midnight.getTime() + (preset === "week" ? 7 : 1) * 86400_000))}T00:00:00+09:00`,
  };
}
export function selectEvents(
  history: History,
  projects: readonly string[],
  period: Period,
): HistoryEvent[] {
  if (
    !validTimestamp(period.start) ||
    !validTimestamp(period.end) ||
    Date.parse(period.start) >= Date.parse(period.end)
  ) {
    throw new Error("期間が不正です。");
  }
  const start = Date.parse(period.start),
    end = Date.parse(period.end);
  return history.events
    .filter(
      (e) =>
        projects.includes(e.projectId) &&
        Date.parse(e.timestamp) >= start &&
        Date.parse(e.timestamp) < end,
    )
    .sort(
      (a, b) =>
        Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
        a.eventId.localeCompare(b.eventId),
    );
}
