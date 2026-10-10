import sample from "../public/fixtures/demo.json" with { type: "json" };
import { parseHistory, type HistoryEvent, type Period } from "./domain.ts";
export const demoHistory = parseHistory(JSON.stringify(sample));
export const PROJECTS: Record<
  string,
  { name: string; agent: string; color: string; symbol: string }
> = {
  komorebi: {
    name: "こもれび / 予約管理",
    agent: "コハク",
    color: "amber",
    symbol: "狐",
  },
  minato: {
    name: "みなと / 在庫管理",
    agent: "アオ",
    color: "blue",
    symbol: "猫",
  },
  tsubame: {
    name: "つばめ / 検索ツール",
    agent: "スミレ",
    color: "purple",
    symbol: "鳥",
  },
};
export interface Statement {
  role: "host" | "agent";
  speaker: string;
  text: string;
  tone: "fact" | "hypothesis" | "suggestion" | "stage";
  evidenceRefs: string[];
}
export interface ReceiptItem {
  text: string;
  evidenceRefs: string[];
}
export interface Retrospective {
  mode: "sample" | "template";
  period: Period;
  projects: string[];
  conversation: Statement[];
  receipt: {
    insights: ReceiptItem[];
    actions: ReceiptItem[];
    unresolved: ReceiptItem[];
  };
}
export interface RetrospectiveProvider {
  generate(
    events: readonly HistoryEvent[],
    period: Period,
    source: "sample" | "import",
  ): Retrospective;
}
const scripts: Record<string, string> = {
  "k-config-1":
    "開店早々、設定を二度読みしてたんだ。初期化ログまで二杯分。おかわりは頼んでないのに。",
  "m-improve":
    "うちは設定取得を一つの関数に集めて、重複呼び出しのテストも足したよ。入口をそろえたんだ。",
  "t-done":
    "検索画面をキーボードで動かせるようにしたよ。操作テストも通った。今日は一杯、いいよね。",
  "k-config-2":
    "ところが別画面でも二度読み。呼び出し元はまだ調査中なんだ。ここはちゃんと持ち帰りたい。",
  "t-open":
    "検索条件を素早く変えるテストが、まだ不安定。原因は分かってない。テストにも落ち着いて飲んでほしい…。",
  "k-done":
    "ひとまず計測ログと再現メモを残した。次の自分が迷子にならないようにね。",
  "m-last":
    "集約した設定取得の回帰テスト、通ったよ。お会計前に、これは報告しておこう。",
};
function exactSample(event: HistoryEvent): boolean {
  const known = demoHistory.events.find((e) => e.eventId === event.eventId);
  return (
    !!known &&
    (Object.keys(known) as (keyof HistoryEvent)[]).every(
      (key) => known[key] === event[key],
    )
  );
}
export class DemoProvider implements RetrospectiveProvider {
  generate(
    events: readonly HistoryEvent[],
    period: Period,
    source: "sample" | "import",
  ): Retrospective {
    const mode =
      source === "sample" && events.every(exactSample) ? "sample" : "template";
    const result: Retrospective = {
      mode,
      period: { ...period },
      projects: [...new Set(events.map((e) => e.projectId))],
      conversation: [],
      receipt: { insights: [], actions: [], unresolved: [] },
    };
    if (!events.length) return result;
    const say = (
      speaker: string,
      text: string,
      tone: Statement["tone"],
      evidenceRefs: string[] = [],
      role: Statement["role"] = "host",
    ) => result.conversation.push({ role, speaker, text, tone, evidenceRefs });
    say(
      "master",
      mode === "sample"
        ? "いらっしゃい。今夜は、持ち寄った記録を肴に。うまくいったことも、引っかかったことも、ここに置いていきな。"
        : "いらっしゃい。今夜は選択した記録の引用会です。内容の推論はせず、記録を順番に確認しましょう。",
      "stage",
    );
    for (const event of events) {
      say(
        event.projectId,
        mode === "sample" && scripts[event.eventId]
          ? scripts[event.eventId]
          : `記録より：「${event.text}」`,
        "fact",
        [event.eventId],
        "agent",
      );
      if (event.kind === "achievement" || event.kind === "improvement")
        result.receipt.insights.push({
          text: event.text,
          evidenceRefs: [event.eventId],
        });
      if (event.kind === "problem" || event.kind === "unresolved") {
        result.receipt.unresolved.push({
          text: event.text,
          evidenceRefs: [event.eventId],
        });
        result.receipt.actions.push({
          text: `提案：${event.projectId} の記録 ${event.eventId} について、再現条件と次の確認方法を整理する。`,
          evidenceRefs: [event.eventId],
        });
      }
    }
    const has = (...ids: string[]) =>
      ids.every((id) => events.some((e) => e.eventId === id));
    if (mode === "sample" && has("k-config-1", "k-config-2")) {
      say(
        "master",
        "こもれびでは、設定の重複読み込みが二つの記録に出てるね。繰り返しているところから見ていこう。",
        "fact",
        ["k-config-1", "k-config-2"],
      );
    }
    if (mode === "sample" && has("k-config-2", "m-improve")) {
      say(
        "minato",
        "仮説だけど、入口が分かれているのかも。原因はまだ断定できないね。",
        "hypothesis",
        ["k-config-2", "m-improve"],
        "agent",
      );
      say(
        "master",
        "みなとの集約とテスト追加を、こもれびでも検討してみよう。まず呼び出し元の確認から。明日の一品だ。",
        "suggestion",
        ["k-config-2", "m-improve"],
      );
      result.receipt.actions.unshift({
        text: "提案：こもれびの呼び出し元を確認し、みなとの設定取得集約と重複防止テストを適用できるか検討する。",
        evidenceRefs: ["k-config-2", "m-improve"],
      });
    }
    say(
      "master",
      "そろそろ、お会計。持ち帰るものは右の伝票へ。解決したとは決めつけず、明日の一手を一つずつ。おつかれさま。",
      "stage",
    );
    validateEvidence(result, events);
    return result;
  }
}
export function validateEvidence(
  result: Retrospective,
  events: readonly HistoryEvent[],
): void {
  const ids = new Set(events.map((e) => e.eventId));
  const items = [
    ...result.conversation,
    ...Object.values(result.receipt).flat(),
  ];
  for (const item of items) {
    if (
      (!("tone" in item) || item.tone !== "stage") &&
      item.evidenceRefs.length === 0
    )
      throw new Error("根拠のない発言・持ち帰り項目があります。");
    for (const id of item.evidenceRefs)
      if (!ids.has(id)) throw new Error(`選択範囲に存在しない根拠ID: ${id}`);
  }
}
// Quote all untrusted content as literal Markdown text; never emit imported HTML or links.
export function markdownText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}\[\]()#+.!|~\-])/g, "\\$1")
    .replace(/\r?\n/g, " ");
}
export function toMarkdown(
  result: Retrospective,
  events: readonly HistoryEvent[],
): string {
  validateEvidence(result, events);
  const lines = [
    "# Agent Izakaya — お会計",
    "",
    "サンプル会話・実AI未接続（決定論的DemoProvider）",
    result.mode === "sample"
      ? "完全架空のfixtureによるサンプル脚本。口調・冗談は演出でありAIの内心ではありません。"
      : "任意入力の引用テンプレート。LLMの推論・原因分析は実行していません。",
    "",
    `期間: ${result.period.start} 以上 / ${result.period.end} 未満`,
    "基準タイムゾーン: Asia/Tokyo（UTC+09:00）",
    `プロジェクト: ${result.projects.map(markdownText).join(", ") || "なし"}`,
    "",
  ];
  const sections = [
    ["持ち帰る知見", result.receipt.insights],
    ["明日の一手（提案）", result.receipt.actions],
    ["積み残し（選択履歴時点）", result.receipt.unresolved],
  ] as const;
  for (const [title, items] of sections) {
    lines.push(`## ${title}`, "");
    lines.push(
      ...(items.length
        ? items.map(
            (i) =>
              `- ${markdownText(i.text)} — 根拠: ${i.evidenceRefs.join(", ")}`,
          )
        : ["対象なし"]),
    );
    lines.push("");
  }
  lines.push("## 根拠イベント", "");
  for (const e of events)
    lines.push(
      `- ${e.eventId} | ${e.projectId} / ${e.sessionId} | ${e.timestamp} | ${e.kind}`,
      `  ${markdownText(e.text)}`,
    );
  if (!events.length) lines.push("対象なし");
  return lines.join("\n") + "\n";
}
