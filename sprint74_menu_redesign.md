# Sprint #74 — メニュー全面再設計（シンプル化・統一構造化）

> **背景**：Sprint #73 までで「基本機能・拡張AI・職員管理・ウィザード・運用管理」が出揃った。
> 今こそメニューを「自治体現場の人が迷わない構造」に整理し直す。

---

## 1. 現状の問題点（診断）

### 問題① 経営・政策 が肥大化（14ページ）
本来は「町長・議会向け KPI 閲覧」の層のはずが、移住定着リスクAI・往診AI・CO2トラッカーなど「拡張AI機能」まで全部ここに入っている。視認性が壊れている。

### 問題② 部門別グループが未実装のまま active 表示
教育・警察消防・医療介護・公共設備 の 4モジュール・17ページは pages が定義されているが、実際の `page.tsx` は存在しない（404になる）。ページ数が多く見えるが実態がない。

### 問題③ 自治体ページの構造がバラバラ
- 霧島市：11ページ（充実）
- 海士町・五島市・輪島市・西粟倉村・上勝町・神埼市・気仙沼市：各1ページのみ
- 四万十市：4ページ
→ 新自治体追加のたびに構造が変わる。統一テンプレートが必要。

### 問題④ 職員支援とPersonal Coarc の混在
職員支援に「AI文書起案」「困り事→施策提案」が混入。
Personal Coarc は自治体DXと無関係なのに cross グループに同居。

### 問題⑤ 重複リンク
同一URL（例：`/gyosei/migration-risk`）が「経営・政策」にも「各自治体ページ」にも存在。保守コストが高い。

---

## 2. 削除・非表示化する項目

### 🗑️ 削除（status: 'hidden' または完全削除）

| 項目 | 理由 |
|---|---|
| `department` グループ全体（教育・警察消防・医療介護・公共設備） | 実装ページなし・404。将来の別スプリントで正式実装するまで非表示 |
| `koumuin`（公務員連携） | 経営・政策と内容が重複。経営・政策に統合 |
| `personal-coarc`（Personal Coarc） | 自治体DXの文脈から外れる。独立製品として別アプリ化を検討 |
| `executive` 内の拡張AI 12機能 | ↓「AI拡張機能」グループへ分離 |
| 霧島市ページ内の重複項目（infra-aging・fiscal-health・management-dashboard） | `/gyosei/*` 共通ページと URL が重複。霧島市側を削除し共通側を使う |
| 屋久島町の `yakushima-setup`（組織設計ウィザード準備中） | ウィザードは基盤グループに集約 |

### 📦 別グループへ移動

| 項目 | 移動先 |
|---|---|
| 移住定着リスクAI・往診AI・CO2・農業・子育て・復興・地場産業（7機能） | `executive` → 新設 `ai-ext`（AI拡張機能）グループ |
| 週次WBサマリー生成・離職リスクスコアリング・緊急時住民支援 | `executive` → `staff`（職員支援）グループ |
| 組織設計ウィザード | `platform` に統合（重複削除） |

---

## 3. 新メニュー構造（設計案）

### グループ構成（5→4 に整理）

```
旧: core / department / cross / municipality / platform
新: core / ai-ext / municipality / platform
```

| グループID | ラベル | 色 | 説明 |
|---|---|---|---|
| `core` | 🏛️ 基本機能 | 既存 | 全自治体共通・住民接点・職員支援・経営ダッシュボード |
| `ai-ext` | 🤖 AI拡張機能 | violet | 課題特化型AIエンジン群（選択導入型） |
| `municipality` | 🏙️ 自治体ページ | 既存 | 自治体ごとの統一4セクション構成 |
| `platform` | ⚙️ 運用管理 | orange | ウィザード・設定・監視・IT管理 |

---

### グループ① 🏛️ 基本機能（core）

**住民接点モジュール（sky）**
| ページ | href | 備考 |
|---|---|---|
| 💬 LINE住民相談AI | /gyosei/line-consultation | ✅ 実装済み |
| 📍 タッチポイント記録 | /gyosei/touchpoints | ✅ 実装済み |
| 🔔 住民プッシュ通知 | /gyosei/push-notifications | ✅ 実装済み |
| 🏘️ 住民サービス状況 | /gyosei/services | ✅ 実装済み |

**職員支援モジュール（emerald）**
| ページ | href | 備考 |
|---|---|---|
| 💚 職員コンディション | /gyosei/staff | ✅ 実装済み |
| ✨ AI文書自動起案 | /gyosei/document-generator | ✅ 実装済み |
| 🔮 予兆検知 | /gyosei/predictive-alerts | ✅ 実装済み |
| 🎯 住民困り事レーダー | /gyosei/citizen-radar | ✅ 実装済み |
| 💡 困り事→施策提案 | /gyosei/issue-policy | ✅ 実装済み |
| 🚨 緊急時住民支援 | /gyosei/emergency-support | ✅ 実装済み（移動） |
| 📋 週次WBサマリー | /gyosei/weekly-summary | ✅ 実装済み（移動） |
| 🔴 離職リスクスコアリング | /gyosei/risk-scoring | ✅ 実装済み（移動） |

**経営・政策モジュール（violet）** ← 大幅スリム化
| ページ | href | 備考 |
|---|---|---|
| 📊 Well-Beingダッシュボード | /gyosei/dashboard | ✅ 実装済み |
| 🏛️ 経営ダッシュボード | /gyosei/management-dashboard | ✅ 実装済み |
| 🤖 AI Well-Being顧問 | /ai-advisor | ✅ 実装済み |
| 💴 財政健全化管理 | /gyosei/fiscal-health | ✅ 実装済み |
| 🏗️ インフラ老朽化管理 | /gyosei/infra-aging | ✅ 実装済み |
| 📊 四半期AI分析レポート | /gyosei/quarterly-report | ✅ 実装済み |
| 🔍 DX効果測定 | /gyosei/dx-effectiveness | ✅ 実装済み |
| 📥 人口・地域データ | /gyosei/population | ✅ 実装済み |
| 💰 収益・財政データ | /gyosei/revenue | ✅ 実装済み |

**研修・学習モジュール（purple）** ← cross から core へ
| ページ | href | 備考 |
|---|---|---|
| 🏭 Mission in LOGI-TECH | /card-game/select | ✅ 実装済み |
| 🥬 八百屋アジャイル道場 | /card-game/agile-yasai | ✅ 実装済み |
| 🏛️ 行政DXチャレンジ | /card-game/gyosei-dx | ✅ 実装済み |
| 💚 Well-Being QUEST | /well-being-quest | ✅ 実装済み |

> 削除: 公務員連携（koumuin）→ 経営モジュールに統合
> 削除: department グループ全体 → hidden に変更
> 削除: Personal Coarc → hidden（別製品として分離検討）

---

### グループ② 🤖 AI拡張機能（ai-ext）新設

「選択導入型」の課題特化AIエンジン群を独立グループ化。
経営・政策から分離し、ウィザードで選択した機能だけが各自治体ページに表示される。

| ページ | href | 対象課題 |
|---|---|---|
| 🏡 移住定着リスクAI | /gyosei/migration-risk | 移住者の早期転出防止 |
| 🏥 往診優先順位AI | /gyosei/visit-priority | 離島・医師不足の在宅医療 |
| 🌱 CO2削減進捗トラッカー | /gyosei/carbon-tracker | ゼロカーボン推進 |
| 🌾 農業担い手マッチングAI | /gyosei/farm-matching | 農業後継者不足 |
| 👶 子育て流出リスクAI | /gyosei/childcare-risk | 子育て世帯の転出防止 |
| 🏗️ 復興進捗ダッシュボード | /gyosei/recovery-dashboard | 被災自治体の復興管理 |
| 🏭 地場産業6次産業化AI | /gyosei/local-industry | 地場産業の衰退防止 |

> このグループの機能は「全自治体に表示するが、データがない自治体はグレーアウト」とする。
> または「ウィザードで選択した機能だけがサイドバーに表示」のどちらかで実装。

---

### グループ③ 🏙️ 自治体ページ（municipality）

**統一4セクション構成テンプレート**

新規自治体追加時は必ずこの4セクション構造で作る。

```
【自治体名】RunWith
  ─ 基本機能 ─────────────────────────────
  📊 Well-Beingダッシュボード    → /gyosei/dashboard
  💬 LINE住民相談AI              → /gyosei/line-consultation
  📈 施策PDCA追跡                → /gyosei/pdca-tracking  (共通化後)
  👤 住民個人AIコーチ            → /gyosei/resident-coach (共通化後)

  ─ AI拡張機能 ────────────────────────────
  （ウィザードで選択した機能のみ表示）
  例: 🏡 移住定着リスクAI
  例: 🏥 往診優先順位AI

  ─ 職員管理 ──────────────────────────────
  💚 職員コンディション          → /gyosei/staff
  📋 週次WBサマリー              → /gyosei/weekly-summary
  🔴 離職リスクスコアリング      → /gyosei/risk-scoring

  ─ 運用管理 ──────────────────────────────
  ⚙️ 自治体プロフィール設定      → /gyosei/settings
  📋 IT運用成熟度診断            → /runwith/maturity
  🧠 組織設計ウィザード          → /runwith/org-wizard
```

#### 既存自治体の対応方針

| 自治体 | 現状 | Sprint #74 での対応 |
|---|---|---|
| 霧島市 | 11ページ（独自機能多数） | 4セクション構造に整理。重複ページを削除し共通ページへ誘導 |
| 屋久島町 | 8ページ（独自機能あり） | 4セクション構造に整理 |
| 海士町 | 1ページのみ | 4セクション + 拡張（移住定着リスクAI）に拡充 |
| 五島市 | 1ページのみ | 4セクション + 拡張（往診優先順位AI）に拡充 |
| 輪島市 | 1ページのみ | 4セクション + 拡張（復興ダッシュボード）に拡充 |
| 西粟倉村 | 1ページのみ | 4セクション + 拡張（農業マッチング）に拡充 |
| 上勝町 | 1ページのみ | 4セクション + 拡張（CO2トラッカー）に拡充 |
| 神埼市 | 1ページのみ | 4セクション + 拡張（子育て流出AI）に拡充 |
| 気仙沼市 | 1ページのみ | 4セクション + 拡張（地場産業AI）に拡充 |
| 四万十市 | 4ページ | 4セクション構造へ整合（ほぼ完成） |
| NEC | ウィザードのみ | 法人向け構造を別途検討。status: 'coming' で残す |

---

### グループ④ ⚙️ 運用管理（platform）— スリム化

| ページ | href | 備考 |
|---|---|---|
| 🧠 組織設計ウィザード | /runwith/org-wizard | 最重要・先頭に配置 |
| ⚙️ 自治体プロフィール設定 | /gyosei/settings | ✅ 実装済み |
| 🌐 横展開設定 | /runwith/multi-tenant | ✅ 実装済み |
| 📋 IT運用成熟度診断 | /runwith/maturity | ✅ 実装済み |
| 🧠 集合知ナレッジブラウザ | /runwith/knowledge | ✅ 実装済み |
| 📡 サービス監視 | /runwith/monitoring | ✅ 実装済み |
| 🗂️ 構成管理（CMDB） | /runwith/cmdb | ✅ 実装済み |
| 🔐 MCPゲートウェイ ログ | /runwith/mcp-gateway | ✅ 実装済み |
| 📊 オープンデータ連携 | /gyosei/opendata | ✅ 実装済み |

> 削除: `platform-org-wizard` の重複（基盤グループ内に1つだけ残す）

---

## 4. スプリント設計

### Sprint #74-A：削除・非表示化（1日）

**タスク**
1. `features.ts` の department グループ全4モジュールを `status: 'hidden'` へ変更
   - 教育・警察消防・医療介護・公共設備の各ページを `status: 'hidden'` に
2. `personal-coarc` モジュールを `status: 'hidden'` に変更（完全削除はせず将来に備える）
3. `koumuin`（公務員連携）を `hidden` に変更
4. 重複ページの削除：
   - `executive` 内の移住AI・往診AI・CO2・農業・子育て・復興・地場産業（7件）を hidden
   - 霧島市の `kirishima-infra-aging`・`kirishima-fiscal-health`（共通ページと重複）を hidden
5. `tsc --noEmit` → push

**確認ポイント**: サイドバーがスリム化された状態をブラウザで確認

---

### Sprint #74-B：グループ再編（1〜2日）

**タスク**
1. `GROUP_LABELS` と `GROUP_ORDER` に `ai-ext` グループを追加
   ```typescript
   export const GROUP_LABELS: Record<ModuleGroup, string> = {
     core:         '🏛️ 基本機能',
     ai-ext:       '🤖 AI拡張機能',
     municipality: '🏙️ 自治体ページ',
     platform:     '⚙️ 運用管理',
   }
   export const GROUP_ORDER = ['core', 'ai-ext', 'municipality', 'platform']
   ```
2. 移住AI・往診AI・CO2・農業・子育て・復興・地場産業 を `ai-ext` グループの新モジュールとして登録
3. 週次WBサマリー・離職リスク・緊急時住民支援 を `executive` から `staff` モジュールへ移動
4. 研修・学習（training）を `cross` → `core` グループへ変更
5. `executive` モジュールのページ数を14→9に削減
6. `tsc --noEmit` → push

---

### Sprint #74-C：自治体ページ統一構造化（2〜3日）

**タスク**
1. 共通ページ化が必要な機能を確認・実装
   - PDCA追跡：現在は `yakushima/pdca-tracking`・`kirishima/pdca-tracking` で個別。`/gyosei/pdca-tracking` として共通化（municipalityId 切り替え対応）
   - 住民個人AIコーチ：同様に `/gyosei/resident-coach` として共通化
2. 各自治体モジュールのページ配列を4セクション構成（基本/拡張/職員管理/運用管理）に書き直し
   - 優先：霧島市・屋久島町（最多ページ数のため整理コスト大）
   - 次点：海士町・五島市・輪島市・西粟倉村・上勝町・神埼市・気仙沼市（各1→4セクションへ拡充）
3. ウィザードの `features.ts` 自動生成コード（provision API）を4セクション構造対応に改修
4. `tsc --noEmit` → push

---

### Sprint #74-D：PDCA追跡・住民AIコーチ共通化（2日）

**タスク**
1. `/api/gyosei/pdca-tracking/route.ts` を新設（municipalityId でフィルタリング）
   - 既存 `/api/yakushima/pdca-tracking` と `/api/kirishima/pdca-tracking` を統合
2. `/gyosei/pdca-tracking/page.tsx` を新設
3. `/api/gyosei/resident-coach/route.ts` を新設
4. `/gyosei/resident-coach/page.tsx` を新設
5. `features.ts` を更新・`tsc --noEmit` → push

---

## 5. 実装後の期待状態

### サイドバー構造（完成イメージ）

```
🏛️ 基本機能
  🏘️ 住民接点
    💬 LINE住民相談AI
    📍 タッチポイント記録
    🔔 住民プッシュ通知
    🏘️ 住民サービス状況
  👥 職員支援
    💚 職員コンディション
    ✨ AI文書自動起案
    🔮 予兆検知
    🚨 緊急時住民支援
    📋 週次WBサマリー
    🔴 離職リスクスコアリング
    🎯 住民困り事レーダー
    💡 困り事→施策提案
  📊 経営・政策（9ページ）
    📊 Well-Beingダッシュボード
    🏛️ 経営ダッシュボード
    🤖 AI Well-Being顧問
    💴 財政健全化管理
    🏗️ インフラ老朽化管理
    📊 四半期AI分析レポート
    🔍 DX効果測定
    📥 人口・地域データ
    💰 収益・財政データ
  🎮 研修・学習（4ページ）

🤖 AI拡張機能
  🤖 課題特化型AI（7機能）
    🏡 移住定着リスクAI
    🏥 往診優先順位AI
    🌱 CO2削減進捗トラッカー
    🌾 農業担い手マッチングAI
    👶 子育て流出リスクAI
    🏗️ 復興進捗ダッシュボード
    🏭 地場産業6次産業化AI

🏙️ 自治体ページ
  🏙️ 霧島市 RunWith
    ─ 基本機能
    ─ AI拡張機能
    ─ 職員管理
    ─ 運用管理
  🏝️ 屋久島町 RunWith（同構造）
  ... （他8自治体も同構造）

⚙️ 運用管理
  🧠 組織設計ウィザード  ← 先頭
  ⚙️ 自治体プロフィール設定
  🌐 横展開設定
  ... （9ページ）
```

---

## 6. 工数見積もり

| スプリント | 内容 | 工数 |
|---|---|---|
| #74-A | 削除・hidden 化（features.ts のみ） | 半日 |
| #74-B | グループ再編（features.ts 大幅改修） | 1日 |
| #74-C | 自治体ページ統一構造化 | 2日 |
| #74-D | PDCA・住民AIコーチ共通化（APIとUI実装） | 2日 |
| **合計** | | **約5.5日** |

---

## 7. 判断が必要な事項（Yoshitaka さんへ確認）

### Q1. AI拡張機能グループの表示ルール
- **案A**：全自治体に全7機能を表示。データがない自治体はグレーアウト
- **案B**：ウィザードで選択した機能のみ各自治体ページに表示（共通グループには常時表示）
- **案C**：共通グループには表示しない。各自治体ページにのみ表示

### Q2. 部門別グループ（教育・警察消防・医療介護・公共設備）の将来
- 完全削除する？→ 将来の正式実装まで features.ts から消す
- hidden で残す？→ コードには残し、サイドバーに表示しないだけ
- Sprint #75 以降で順次実装する？→ どの部門を最初に作るか

### Q3. Personal Coarc の扱い
- 自治体DXアプリから分離して独立URL（別デプロイ）にする？
- このアプリ内に残すが hidden にする？

### Q4. NEC コーポレートIT の扱い
- 法人向けは自治体と同じ municipality グループに残す？
- 別グループ（enterprise など）にする？
