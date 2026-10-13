# Issue #5 — 体験評価 / Experience evaluation

2026-10-14 JST。実装者による小さな手動評価であり、ユーザー調査や実モデルの品質評価ではありません。すべて架空データです。親は PR #4 / `87e096bd88b206202c3b41e5adf2ef5db1e26ce2`。

## 改善前の観察 / Before

- 未設定LLMの説明と全設定が入店ボタンより先に現れ、特に390pxでは主操作まで長くスクロールする必要があった。
- 7記録・12発言のDemoで、設定重複に対する具体提案1件と同じ課題の汎用提案2件が並んでいた。
- 会話の追加ごとに末尾へ移動し、過去発言を読んでいる途中でも位置が変わった。終了後の再生専用操作がなかった。

## 改善後の操作 / Reproduction

リポジトリで `env -u IZAKAYA_LLM_BASE_URL -u IZAKAYA_LLM_MODEL -u IZAKAYA_LLM_API_KEY npm run dev -- --port 14405` を実行し、`http://127.0.0.1:14405/` を開く。ほかのサーバーは停止しない。

1. 1280×800 / 850×850 / 390×844で、初期画面の「暖簾をくぐる」を押す。設定は開かず入店できる。
2. 一時停止→再生→全表示を操作。過去の発言を読んでいる間は位置が保たれ、「最新の発言へ」で末尾に移動できる。
3. 発言の根拠IDから元の記録を開く。再生中なら停止する。Escape / × / 戻るボタンで閉じ、元の根拠ボタンへフォーカスが戻る。
4. 「明日の一手へ」で伝票へ移動。「まず一つ」とその根拠を確認し、Markdown保存。伝票内の根拠も同じ操作で戻れる。
5. 「会話を見直す」で先頭へ戻り、「同じ会話を再生」で同じ結果を再生。LLMでも生成APIを呼ばず、伝票・生成情報は変わらない。
6. 「記録・期間・生成モードを変更」を開いて期間・担当を変更すると古い結果が消える。LLMの送信先・費用注意はLLM選択時に設定の開閉に関わらず表示される。

## 3シナリオの手動評価 / Three fictional scenarios

判定は「読みやすさ」「根拠」「次の一手」を実際の画面で確認したもの。脚本の面白さを実推論の能力として評価しない。

| シナリオ・再現条件 | 生成方法 | 読みやすさ | 根拠 | 次の一手・限界 |
| --- | --- | --- | --- | --- |
| A: 初期状態、3担当、固定デモ週 | 内蔵Demo脚本、7記録・12発言 | 話者・演出/仮説/提案を区別して読める。3サイズで主操作・根拠ダイアログ・伝票を確認 | 設定の提案から k-config-2 / m-improve / k-config-1 へ辿れる | 提案4件→2件。設定の呼び出し元確認を先頭、検索切替の再現確認を次に表示。解決したとは表示しない |
| B: Aの期間を2026-10-10以上、2026-10-11未満に変更 | 内蔵Demo脚本、2記録・4発言 | スミレの課題とコハクの記録整理が短い会話になる | t-open / k-done のみ。範囲外の設定二度読み・みなとの集約例は現れない | 検索条件切替の再現・条件記録を1件表示。原因は未特定のまま |
| C: 下記のpaper-lantern JSONをBの期間で取込 | 任意JSONの引用テンプレート、2記録・4発言 | 「引用テンプレート / 推論・原因分析なし」を明示。担当名はprojectId | paper-openの本文・fictional-1・元日時をダイアログで照合。サンプルの別事実なし | 再現条件と確認方法の整理を1件。汎用の確認候補で、独自の解決案は生成しない |

```json
{"schemaVersion":1,"events":[{"projectId":"paper-lantern","sessionId":"fictional-1","eventId":"paper-done","timestamp":"2026-10-10T10:00:00+09:00","kind":"achievement","text":"架空の帳票プレビューを追加し、見出しの操作テストが通った。"},{"projectId":"paper-lantern","sessionId":"fictional-1","eventId":"paper-open","timestamp":"2026-10-10T11:00:00+09:00","kind":"unresolved","text":"架空の長い帳票名が狭い画面ではみ出す。原因はまだ調査していない。"}]}
```

## LLMの区別 / Stub versus real model

- ローカルHTTPスタブ: E2Eと本番previewでブラウザ→Node→架空スタブの成功、根拠、Markdown、再生時の追加通信ゼロを検証。UIの失敗・キャンセル・以前の結果保持はmockで、上流への実キャンセルはpreviewの実ソケットで検証した。
- スタブは固定出力であり、面白さ・分析品質・実token usage・実課金の評価ではない。
- 実モデル: 呼び出していない。品質・互換性・費用・受付後キャンセルの挙動は未確認。
- LLM提案の本文・順序は変更しない。「生成された提案の先頭」と表示し、UI独自の事実や優先順位を作らない。

## 画面記録 / Screenshots

Codex内蔵ブラウザの実画面。変更前の850px/390px画像はスクロール途中の表示で、設定が先に並ぶ様子を記録している。横はみ出し・フォーカス・reduced motionはChrome E2Eでも検証した。

| サイズ | 改善前 | 改善後 |
| --- | --- | --- |
| 1280×800 | [入店前](experience/before-1280-entry.png) / [会話と伝票・全体](experience/before-1280-conversation.png) | [入店前](experience/after-1280-entry.png) / [会話と一手](experience/after-1280-conversation.png) / [根拠](experience/after-1280-evidence.png) |
| 850×850 | [設定](experience/before-850-entry.png) | [入店前](experience/after-850-entry.png) / [根拠](experience/after-850-evidence.png) / [伝票](experience/after-850-receipt.png) |
| 390×844 | [設定](experience/before-390-entry.png) | [入店前](experience/after-390-entry.png) / [会話](experience/after-390-conversation.png) / [根拠](experience/after-390-evidence.png) / [伝票](experience/after-390-receipt.png) |

[B: 期間限定](experience/scenario-narrow.png) / [C: 任意JSON](experience/scenario-template.png)

## 残る限界 / Limits

- 内部スクロールは会話に残し、高さをviewportに合わせた。伝票の内部スクロールは廃止。本文の読了速度に合わせた自動再生速度変更は対象外。
- 手動3シナリオは実装者評価。実ユーザー調査、実端末、Safari/Firefox、スクリーンリーダー、最小Node 22.18は未検証。
- 内蔵ブラウザのダウンロード完了イベント待ちはtimeoutした。保存されたファイル内容はChrome E2Eと本番previewで検証済みであり、内蔵ブラウザでの保存完了は主張しない。
- 既存のpublic JSON importに関するVite警告は継続。ビルドと全回帰確認は成功。今回の範囲外の独立機能・既存受入条件の新たな不具合は確認されていない。
