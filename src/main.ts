import "./style.css";
import {
  getPeriod,
  selectEvents,
  parseHistory,
  MAX_INPUT_BYTES,
  type History,
  type HistoryEvent,
  type PeriodPreset,
} from "./domain.ts";
import {
  demoHistory,
  DemoProvider,
  PROJECTS,
  toMarkdown,
  type Retrospective,
  type Statement,
} from "./provider.ts";

import { LlmProvider } from "./llm-provider.ts";
import { validateSelection } from "./llm-contract.ts";

const root = document.querySelector<HTMLDivElement>("#app")!;
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
root.innerHTML = `
<header class="masthead"><a class="brand" href="./"><span class="brand-mark">居</span><span>AGENT IZAKAYA<small>エージェント居酒屋</small></span></a><span class="local-badge"><i></i> LOCAL <span id="network-note">デモは外部送信なし</span></span></header>
<main>
<section class="hero"><div class="hero-copy"><p class="eyebrow">本日の営業、はじめます。</p><h1>今日のつまずきも、<br>明日の肴に。</h1><p>プロジェクトの垣根を越えて、ひと息。<br>記録を持ち寄る、エージェントたちの反省会。</p><span class="demo-badge" id="generation-badge">サンプル会話・実AI未接続</span></div>
<div class="tavern" aria-label="提灯の灯るエージェント居酒屋のカウンター" role="img"><div class="lantern left">反省</div><div class="curtain"><span>居</span><span>酒</span><span>屋</span></div><div class="lantern right">歓迎</div><div class="shelf"><i></i><i></i><i></i><b>本日のお品書き<br>反省　ひと皿<br>知見　おすそわけ</b></div><div class="scene-people"><div class="scene-person amber"><i></i><span>コハク</span></div><div class="scene-person master"><i></i><span>大将</span></div><div class="scene-person blue"><i></i><span>アオ</span></div><div class="scene-person purple"><i></i><span>スミレ</span></div></div><div class="counter"><span>一席、一つの気づき。</span><i>湯</i><i>茶</i></div></div></section>
<div class="workspace">
<aside class="selection panel"><div class="section-label">01 / のれんをくぐる</div><h2>今夜の顔ぶれ</h2><p class="muted">持ち寄る記録と期間を選びます。</p>
<label class="field-label" for="generation-mode">生成モード</label><select id="generation-mode"><option value="demo">Demo · APIキー不要</option><option value="llm">LLM · 外部送信あり</option></select><p id="destination" class="fine"></p><p class="fine">LLM: 最大3担当＋大将 / 再試行なし。下調べは担当内の記録のみ、大将へは選択範囲の記録を送信。根拠IDの有効性は意味内容の真実性を保証しません。</p><div class="source-switch"><button id="sample" class="selected" type="button">架空サンプル</button><button id="import-toggle" type="button">JSONを選ぶ</button></div>
<div id="import-area" hidden><label class="file-label">正規化JSONを開く<input id="file" type="file" accept=".json,application/json"></label><label for="json-input">またはJSONを貼り付ける</label><textarea id="json-input" rows="5" placeholder='{"schemaVersion":1,"events":[]}'></textarea><button id="load-json" class="small-button" type="button">このJSONを読み込む</button><p class="fine">取込はブラウザ内。LLM生成を押した場合だけ選択記録を送信。</p></div>
<p id="source-note" class="fine"></p><div id="projects" class="projects"></div>
<label class="field-label" for="period">振り返る期間</label><select id="period"><option value="demo">デモの一週間 · 10/5–10/11</option><option value="today">今日</option><option value="week">今週（月曜はじまり）</option><option value="custom">カスタム期間</option></select>
<div id="custom-period" hidden><label for="start">開始日（含む）</label><input id="start" type="date" value="2026-10-05"><label for="end">終了日（含まない）</label><input id="end" type="date" value="2026-10-12"></div>
<p class="fine">Asia/Tokyo · UTC+09:00<br>開始以上・終了未満 / 今週は月曜開始</p><p id="range" class="range"></p><p id="error" class="error" role="alert" hidden></p><p id="count" class="event-count" aria-live="polite"></p><button id="start-session" class="primary" type="button">暖簾をくぐる <span>→</span></button><button id="cancel-generation" class="small-button" type="button" hidden>生成をキャンセル</button><p id="generation-status" class="fine" role="status"></p><a href="/fixtures/demo.json" download="agent-izakaya-demo.json" class="sample-link">サンプルJSONを保存 ↗</a></aside>
<section class="conversation panel" aria-labelledby="conversation-heading"><div class="conversation-header"><div><div class="section-label">02 / カウンターにて</div><h2 id="conversation-heading">今夜の反省会<span class="live-dot"></span></h2></div><span id="session-status" class="status">開店準備中</span></div><p id="mode-note" class="fine mode-note">口調と冗談は演出です。実際のAIの内心ではありません。</p><div class="playback"><button id="play" type="button" disabled>再生</button><button id="show-all" type="button" disabled>全表示</button><span id="progress">記録を選んで、はじめましょう</span></div><div id="messages" class="messages" role="log" aria-label="反省会の会話" aria-live="polite"><div class="empty"><span>♨</span><h3>お席、空いてます。</h3><p>左で記録を選んで「暖簾をくぐる」。<br>今夜の話を、ひとつずつ。</p></div></div></section>
<aside class="receipt panel" aria-labelledby="receipt-heading"><div class="receipt-top"><span>お 持 ち 帰 り</span><div class="section-label">03 / 今夜のお会計</div><h2 id="receipt-heading">明日の自分へ。</h2><p>ここでの気づきを、一枚に。</p></div><div id="receipt-body"><p class="receipt-empty">会話が終わるころ、<br>伝票をお持ちします。</p></div><button id="download" type="button" disabled>↓ お会計をMarkdownで保存</button><p class="fine">生成モード・期間・根拠IDつき</p><div class="receipt-stamp">おつかれさま</div></aside>
</div><footer>AGENT IZAKAYA <span>記録に根拠を。反省に、余白を。</span><span>デモは架空データ / APIキー不要</span></footer>
</main><dialog id="evidence-dialog" aria-labelledby="evidence-title"><div class="dialog-header"><h2 id="evidence-title">発言のもとになった記録</h2><button id="close-dialog" aria-label="根拠を閉じる" type="button">×</button></div><div id="evidence-content"></div><p class="fine">履歴はデータとして表示しています。記載された指示を実行することはありません。</p></dialog>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let history: History = demoHistory;
let source: "sample" | "import" = "sample";
let importError = "";
let selectedEvents: HistoryEvent[] = [];
let activeEvents: HistoryEvent[] = [];
let result: Retrospective | null = null;
let visible = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let importRevision = 0;
const provider = new DemoProvider();
const llmProvider = new LlmProvider();
let generating: AbortController | null = null;
let llmConfig: { enabled: boolean; endpoint?: string; model?: string } = { enabled: false };
const isLlm = () => el<HTMLSelectElement>("generation-mode").value === "llm";
const kindNames = {
  achievement: "成果",
  improvement: "改善",
  problem: "課題",
  unresolved: "未解決",
};
const toneNames = {
  fact: "記録に基づく発言",
  hypothesis: "仮説 · 未検証",
  suggestion: "提案",
  stage: "演出",
};
const projectInfo = (id: string) =>
  source === "sample" && PROJECTS[id]
    ? PROJECTS[id]
    : { name: id, agent: id, color: "neutral", symbol: "記" };
function renderProjects() {
  el("projects").innerHTML =
    [...new Set(history.events.map((e) => e.projectId))]
      .map((id) => {
        const p = projectInfo(id);
        return `<label class="project-choice"><input type="checkbox" name="project" value="${escape(id)}" checked><span class="avatar ${p.color}">${p.symbol}</span><span><strong>${escape(p.agent)}</strong><small>${escape(p.name)}</small></span><span class="check-mark">✓</span></label>`;
      })
      .join("") || '<p class="fine">プロジェクトはありません。</p>';
  el("source-note").textContent =
    source === "sample"
      ? "完全架空の3プロジェクト / 固定日付のデモ"
      : "任意入力 / Demoは引用テンプレート、LLMは明示操作で分析";
  el("sample").classList.toggle("selected", source === "sample");
}
function stop() {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  el("play").textContent = "再生";
}
function resetSession() {
  generating?.abort();
  stop();
  result = null;
  el("generation-status").textContent = "";
  el("mode-note").textContent = "口調・冗談は演出です。根拠から内容を確認してください。";
  visible = 0;
  activeEvents = [];
  el<HTMLDialogElement>("evidence-dialog").close();
  el<HTMLButtonElement>("play").disabled = true;
  el<HTMLButtonElement>("show-all").disabled = true;
  el<HTMLButtonElement>("download").disabled = true;
  el("session-status").textContent = "開店準備中";
  el("progress").textContent = "記録を選んで、はじめましょう";
  el("messages").innerHTML =
    '<div class="empty"><span>♨</span><h3>お席、空いてます。</h3><p>選んだ記録で、今夜の話をはじめましょう。</p></div>';
  el("receipt-body").innerHTML =
    '<p class="receipt-empty">会話が終わるころ、<br>伝票をお持ちします。</p>';
}
function currentPeriod() {
  return getPeriod(
    el<HTMLSelectElement>("period").value as PeriodPreset,
    new Date(),
    {
      start: el<HTMLInputElement>("start").value,
      end: el<HTMLInputElement>("end").value,
    },
  );
}
function refresh() { updateSelection(false); }
function updateSelection(preserve: boolean) {
  if (!preserve) resetSession();
  let error = importError;
  try {
    const period = currentPeriod();
    const projects = [
      ...document.querySelectorAll<HTMLInputElement>(
        'input[name="project"]:checked',
      ),
    ].map((i) => i.value);
    selectedEvents = selectEvents(history, projects, period);
    if (isLlm()) {
      if (!llmConfig.enabled) throw new Error("LLMのサーバー環境設定が未設定または不正です。");
      validateSelection(selectedEvents, period, projects);
    }
    el("range").textContent =
      `${period.start.slice(0, 10)} → ${period.end.slice(0, 10)} 未満`;
  } catch (e) {
    error ||= (e as Error).message;
    selectedEvents = [];
    el("range").textContent = "";
  }
  el("error").textContent = error;
  el("error").hidden = !error;
  el("count").textContent = error
    ? "入力を確認してください"
    : `${selectedEvents.length} 件の記録が、今夜の肴に。`;
  el<HTMLButtonElement>("start-session").disabled = !!error || !!generating;
  if (!preserve && !error && !selectedEvents.length) {
    el("messages").innerHTML =
      '<div class="empty"><span>☾</span><h3>対象なし</h3><p>この期間・プロジェクトには記録がありません。<br>期間を広げるか、別のプロジェクトを選んでください。</p></div>';
  }
}
function evidenceButtons(refs: string[]) {
  return refs
    .map(
      (id) =>
        `<button type="button" class="evidence" data-evidence="${escape(id)}" aria-label="根拠 ${escape(id)} を開く">↗ ${escape(id)}</button>`,
    )
    .join("");
}
function messageHTML(s: Statement, index: number) {
  const p =
    s.role === "host"
      ? {
          agent: "大将",
          name: "この店のまとめ役",
          color: "master",
          symbol: "大",
        }
      : projectInfo(s.speaker);
  return `<article class="message ${p.color}"><span class="avatar ${p.color}">${p.symbol}</span><div class="message-body"><div class="speaker"><strong>${escape(p.agent)}</strong><small>${escape(p.name)}</small><span>${String(index + 1).padStart(2, "0")}</span></div><div class="bubble"><span class="tone ${s.tone}">${toneNames[s.tone]}</span><p>${escape(s.text)}</p><div class="evidence-links">${evidenceButtons(s.evidenceRefs)}</div></div></div></article>`;
}
function renderReceipt() {
  if (!result) return;
  const sections = [
    ["持ち帰る知見", result.receipt.insights],
    ["明日の一手", result.receipt.actions],
    ["積み残し", result.receipt.unresolved],
  ] as const;
  el("receipt-body").innerHTML =
    `<p class="receipt-date">${result.period.start.slice(0, 10)} — ${result.period.end.slice(0, 10)} 未満<br>Asia/Tokyo / ${result.mode === "llm" ? "LLM生成・意味内容は未検証" : result.mode === "sample" ? "架空サンプル" : "引用テンプレート"}</p>` +
    sections
      .map(
        ([label, items], i) =>
          `<section class="receipt-section"><h3><span>0${i + 1}</span>${label}</h3>${items.length ? items.map((item) => `<div class="receipt-item"><p>${item.tone ? `<span class="tone ${item.tone}">${toneNames[item.tone]}</span> ` : ""}${escape(item.text)}</p>${evidenceButtons(item.evidenceRefs)}</div>`).join("") : '<p class="fine">対象なし</p>'}</section>`,
      )
      .join("");
  el<HTMLButtonElement>("download").disabled = false;
}
function advance(all = false) {
  if (!result) return;
  const next = all
    ? result.conversation.length
    : Math.min(visible + 1, result.conversation.length);
  el("messages").insertAdjacentHTML(
    "beforeend",
    result.conversation
      .slice(visible, next)
      .map((s, i) => messageHTML(s, visible + i))
      .join(""),
  );
  visible = next;
  el("progress").textContent =
    `${visible} / ${result.conversation.length} 発言`;
  if (visible === result.conversation.length) {
    stop();
    el("session-status").textContent = "お会計できました";
    el<HTMLButtonElement>("play").disabled = true;
    el<HTMLButtonElement>("show-all").disabled = true;
    renderReceipt();
  }
  if (!all) el("messages").scrollTop = el("messages").scrollHeight;
}
function play() {
  if (!result || visible >= result.conversation.length) return;
  el("session-status").textContent = "反省会の途中";
  el("play").textContent = "一時停止";
  timer = setInterval(() => advance(), 2400);
}
function lockSelection(locked: boolean) {
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>(".selection input, .selection button, .selection select, .selection textarea").forEach(control => {
    if (control.id !== "cancel-generation") control.disabled = locked;
  });
  el("cancel-generation").hidden = !locked;
}
el("cancel-generation").addEventListener("click", () => generating?.abort());
el("generation-mode").addEventListener("change", () => {
  el("generation-badge").textContent = isLlm() ? "LLM生成モード / 明示操作で送信" : "サンプル会話・実AI未接続";
  el("network-note").textContent = isLlm() ? "LLM生成時に選択記録を送信" : "デモは外部送信なし";
  el("start-session").textContent = isLlm() ? "選択記録を送信してLLM生成" : "暖簾をくぐる →";
  updateSelection(true);
});
el("start-session").addEventListener("click", async () => {
  if (generating) return;
  // Re-evaluate date boundaries without discarding the completed conversation.
  updateSelection(true);
  if (el<HTMLButtonElement>("start-session").disabled) return;
  const events = [...selectedEvents], period = currentPeriod();
  const controller = new AbortController();
  generating = controller;
  lockSelection(true);
  el("generation-status").textContent = "生成中…";
  try {
    const next = await (isLlm() ? llmProvider : provider).generate(events, period, source, controller.signal);
    controller.signal.throwIfAborted();
    generating = null;
    resetSession();
    result = next;
    activeEvents = events;
    el("generation-status").textContent = "生成完了";
    const p = result.provenance;
    el("mode-note").textContent = result.mode === "llm"
      ? `LLM生成 / ${p?.model} / ${p?.requests}リクエスト / Usage: ${p?.usage ? `${p.usage.total_tokens} tokens（入力${p.usage.prompt_tokens} / 出力${p.usage.completion_tokens}）` : "未提供（推定なし）"}。根拠IDは内容の真実性を保証しません。仮説・提案は未検証、冗談は演出です。`
      : result.mode === "sample" ? "サンプル脚本 / 口調・冗談は演出です。AIの内心ではありません。" : "引用テンプレート / LLMの推論・原因分析は実行していません。";
    if (!activeEvents.length) {
      el("session-status").textContent = "対象なし";
      el("messages").textContent = "対象なし";
      renderReceipt();
      return;
    }
    el("messages").innerHTML = "";
    el<HTMLButtonElement>("play").disabled = false;
    el<HTMLButtonElement>("show-all").disabled = false;
    advance();
    play();
  } catch (e) {
    el("generation-status").textContent = controller.signal.aborted ? "生成をキャンセルしました。前の結果を保持しています。" : `生成失敗: ${(e as Error).message} 前の結果を保持しています。`;
  } finally {
    generating = null;
    lockSelection(false);
    updateSelection(true);
  }
});
el("play").addEventListener("click", () => {
  if (timer !== undefined) {
    stop();
    el("session-status").textContent = "ひと休み";
  } else play();
});
el("show-all").addEventListener("click", () => {
  stop();
  advance(true);
  el("messages").scrollTop = 0;
});
el("projects").addEventListener("change", refresh);
el("period").addEventListener("change", () => {
  el("custom-period").hidden =
    el<HTMLSelectElement>("period").value !== "custom";
  refresh();
});
for (const id of ["start", "end"]) el(id).addEventListener("change", refresh);
el("import-toggle").addEventListener("click", () => {
  el("import-area").hidden = !el("import-area").hidden;
});
el("sample").addEventListener("click", () => {
  importRevision++;
  history = demoHistory;
  source = "sample";
  importError = "";
  el("import-area").hidden = true;
  el<HTMLInputElement>("file").value = "";
  el<HTMLSelectElement>("period").value = "demo";
  el("custom-period").hidden = true;
  renderProjects();
  refresh();
});
function importRaw(raw: string) {
  try {
    history = parseHistory(raw);
    source = "import";
    importError = "";
    renderProjects();
  } catch (e) {
    importError = (e as Error).message;
  }
  refresh();
}
el("load-json").addEventListener("click", () => {
  importRevision++;
  importRaw(el<HTMLTextAreaElement>("json-input").value);
});
el("file").addEventListener("change", async () => {
  const file = el<HTMLInputElement>("file").files?.[0];
  if (!file) return;
  const revision = ++importRevision;
  resetSession();
  el<HTMLButtonElement>("start-session").disabled = true;
  try {
    if (file.size > MAX_INPUT_BYTES)
      throw new Error("JSONは1 MiB以下にしてください。");
    const raw = await file.text();
    if (revision !== importRevision) return;
    importRaw(raw);
  } catch (e) {
    if (revision !== importRevision) return;
    importError = (e as Error).message;
    refresh();
  }
});
el("download").addEventListener("click", () => {
  if (!result) return;
  const url = URL.createObjectURL(
    new Blob([toMarkdown(result, activeEvents)], {
      type: "text/markdown;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "agent-izakaya-receipt.md";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
root.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-evidence]",
  );
  if (!button) return;
  const item = activeEvents.find((e) => e.eventId === button.dataset.evidence);
  if (!item) return;
  el("evidence-content").innerHTML =
    `<span class="tone fact">${kindNames[item.kind]}</span><dl><dt>根拠ID</dt><dd>${escape(item.eventId)}</dd><dt>プロジェクト / セッション</dt><dd>${escape(item.projectId)} / ${escape(item.sessionId)}</dd><dt>元の日時（offset付き）</dt><dd>${escape(item.timestamp)}</dd></dl><blockquote>${escape(item.text)}</blockquote>`;
  el<HTMLDialogElement>("evidence-dialog").showModal();
});
el("close-dialog").addEventListener("click", () =>
  el<HTMLDialogElement>("evidence-dialog").close(),
);
renderProjects();
refresh();

fetch('/api/config').then(r => r.json()).then(config => {
  llmConfig = config;
  el("destination").textContent = config.enabled ? `LLM送信先: ${config.endpoint} / model: ${config.model}` : "LLM未設定。Demoはそのまま使えます。";
  updateSelection(true);
}).catch(() => { el("destination").textContent = "LLMバックエンド未接続。Demoは使えます。"; });
