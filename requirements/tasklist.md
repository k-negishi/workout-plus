# Workout+ ワイヤーフレーム完成タスクリスト

> **現在のフェーズ**: Phase 0 設計
> **ゴール**: 全画面の「何を・どこに・どう並べるか」を確定する
> **技術方針**: React (HTML) でワイヤー/プロト → Flutter (Dart) で本実装
> **最終更新**: 2026-02-17

---

## 完了済みタスク

- [x] **Task 1** デザイン方向性 — ClickUp + v1_light 採用
- [x] **Task 2** 全画面洗い出し — `proposal_screens_and_states.md` (14 MVP画面)
- [x] **Task 3** UIパターン選定 — `proposal_ui_patterns.md` (P1 Strong記録画面, 2-mode view/edit)
- [x] **Task 4** 画面遷移フロー — `proposal_screen_flow.md` (4タブ C案, フローティングバー)
- [x] **Task 5** 状態パターン — `proposal_screens_and_states.md` (Empty/Active/Success/Error マトリクス)
- [x] **Task 6** 統一WF統合 — `workout_plus_wireframes_v2.html` (8画面統合済)

### 統一WFに含まれている画面 (8/14)

- [x] ホーム/ダッシュボード
- [x] ワークアウト記録(セット入力)
- [x] 種目選択(フルスクリーンモーダル)
- [x] 種目別履歴(ボトムシート)
- [x] 種目別履歴(フルスクリーン展開)
- [x] カレンダー
- [x] 統計
- [x] ワークアウト完了サマリー

---

## 残タスク (Task 8: 未作成画面のWF)

### Priority A: 記録フローに直結

- [ ] **8a** ワークアウト詳細(閲覧モード) — Must / カレンダー/ホームからの遷移先。記録画面のRead Only版
- [ ] **8b** ワークアウト編集モード — Must / 8aのView→Edit遷移。proposal_ui_patternsで2-mode方式採用済
- [ ] **8c** 記録破棄確認ダイアログ — Must / 記録画面から呼出。シンプルなダイアログ

### Priority B: 設定系（定型UIのため工数小）

- [ ] **8d** 設定トップ — Must / v1にあり。v2デザインに変換
- [ ] **8e** 設定 > バックアップ — Must / iCloud/GDrive。iOSの設定画面パターン
- [ ] **8f** 設定 > タイマー設定 — Must / デフォルトインターバル秒数カスタマイズ
- [ ] **8g** 設定 > 単位設定 — Must / kg/lb, cm/in 切替

### Task 9: エクササイズアイコン選定

- [ ] 既存ライブラリから同一パック/アーティストで5種目分を選定 → 詳細: `requirements/todo/エクササイズアイコン選定.md`

### Task 10: デザインレビュー（Phase 0 出口ゲート）

> Task 8〜9 完了後に実施。これをパスしたら Phase 1 MVP（Flutter実装）に進む。

- [ ] 全14画面の通しレビュー（画面遷移・一貫性・抜け漏れ確認）
- [ ] デザイントークン準拠チェック（カラー・radius・font-weight・spacing）
- [ ] SVGアイコン・アセット最終確認（全画面で統一されているか）

### Priority C: 将来（MVPでは作らない）

- [ ] オンボーディング — 不要（空状態CTAで代替）
- [ ] プロフィール/アカウント — 不要（設定内で代替）
- [ ] 種目詳細(やり方説明) — 不要（バッジで代替）
- [ ] 検索画面 — 不要（種目選択内検索で代替）
- [ ] AIチャット — Should（MVP後）
- [ ] ペイウォール — 将来

---

## 決定済み事項

### デザインシステム (v1_light)
- Primary: #4D94FF / Dark: #3385FF / BG: #E6F2FF
- Success: #10B981
- Text: #475569 (primary), #64748b (secondary), #334155 (heading)
- Border: #e2e8f0 / BG: #f9fafb / Card: #ffffff
- Font: Noto Sans JP (400, 600, 700)
- border-radius: 6px, 8px, 12px のみ
- グラデーション禁止、シャドウ最小限

### UIパターン
- 記録画面: P1 Strong (14/15点)
- 種目選択: フルスクリーンモーダル (1種目選択)
- 種目履歴: ボトムシート 70% → フルスクリーン展開
- セット入力: インライン前回記録表示 (候補A)
- View/Edit: 2-mode方式 (記録中=always-edit, 閲覧後=view+inline-edit)

### 画面遷移
- 4タブ: ホーム / カレンダー / [+] / 統計
- 記録中: フローティングバー (44px, #4D94FF, 白文字)
- 設定: 右上アバターアイコンから
