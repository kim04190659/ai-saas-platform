# 【結(YUI)】— Claude Cowork 作業ガイド

サービス名は **【結(YUI)】**。てつだって(個人)・Coarc(企業)・RunWith(自治体)を1つに統合した基盤。
開発リポジトリはこれまで通り `ai-saas-platform` を使用する(改名はしない)。

このファイルは、Cowork / Claude Codeがこのリポジトリで作業する際に**必ず参照するルール**。
セクション1(全体ガバナンスルール)がプロジェクト全体の方針、セクション2以降がこのリポジトリ固有の技術ルール。

> 上位ルールの正本はNotion。矛盾した場合はNotionを更新し、このファイルに反映すること。
> 参照: [プロジェクト進行ルール](https://app.notion.com/p/3a1960a91e2381229462f227813c568e) / [【結 YUI】統合基盤構想](https://app.notion.com/p/39d960a91e23814482c8fb3a7608ea8d)

## 目次

0. [プロジェクト概要](#0-プロジェクト概要)
1. [全体ガバナンスルール](#1-全体ガバナンスルール)
2. [Notion ページ構成ルール](#2-notion-ページ構成ルール)
3. [主要 Notion ページ ID](#3-主要-notion-ページ-id)
4. [環境変数(Vercel)](#4-環境変数vercel)
5. [コードの重要ファイル](#5-コードの重要ファイル)
6. [マルチテナント設計方針](#6-マルチテナント設計方針)
7. [左メニュー(Sidebar)設計ルール](#7-左メニューsidebar設計ルール)
8. [右メニュー(ChatPanel)設計ルール](#8-右メニューchatpanel設計ルール)
9. [開発スタイル](#9-開発スタイル)
10. [BCP確認ルール](#10-bcp確認ルール)
11. [Claude API(Haiku)利用ルール](#11-claude-apihaiku利用ルール)

---

## 0. プロジェクト概要

自治体向けWell-Being × SDL × DX基盤。
住民LINE相談 → 職員エクセレントサービス → Notion蓄積 → AI政策提言 のサイクルを実現。

- **Webアプリ**: Next.js 15 / TypeScript / Vercel
- **ナレッジ基盤**: Notion(MCP連携済み)
- **AI**: Claude API(Anthropic)
- **担当**: Yoshitaka(NEC DX/AX推進担当、情報工学経験35年、コード実装は久しぶり)

このリポジトリには【結】の3層+教育ツールが同居している。

| モジュール | ディレクトリ | 対応する【結】の層 |
|---|---|---|
| 個人・企業向け | `src/app/(dashboard)/personal-coarc` | てつだって・Coarc |
| 自治体向けIT運用 | `src/app/(dashboard)/runwith` | RunWith |
| 行政OS(地域診断) | `src/app/(dashboard)/gyosei` | RunWith |
| 教育ツール | `src/app/card-game` | 3層共通の教育ツール |

各モジュールは `ScenarioContext` で連携する(カードゲーム体験 → 行政OS診断 → RunWith実装 → Notion保存)。

---

## 1. 全体ガバナンスルール

> Notion「プロジェクト進行ルール」(2026-07-18時点)の内容。詳細・最新版は常にNotion側を正とする。

### 1.1 開発環境の方針
- Antigravityは使用しない。開発はCowork内のClaude Codeで行う。
- Webサービス実装はGitHub / Vercel / Supabaseのみを使う。新規SaaSを勝手に追加しない。
- 設計書・議事録・分析はNotionに集約する。コード側READMEに長文説明を書かず、詳細はNotionにリンクする。

### 1.2 成果物の置き場所

| 種類 | 置き場所 |
|---|---|
| 設計書・議事録・分析・企画 | Notion |
| 動くコード | このリポジトリ(GitHub) |
| デプロイ済みサービス | Vercel |
| データ・DB | Supabase |
| 図・画像・動画素材 | Google Nano Banana / Veo → Notionに登録 |

### 1.3 意思決定の優先順位
1. 現地ITベンダー(保守・運用拠点網を持つパートナー全般。NECフィールディングはその1社であり、展開先を同社に限定しない)との合意形成
2. 自治体職員・首長への提案(単年度予算・入札プロセスに配慮)
3. 地域企業(Coarc見込み客)への価値提供
4. 地方銀行・信用金庫との接点づくり

【結】はNECフィールディングがスコープとしていない街にも提供する。特定ベンダー1社に展開先を限定する設計・文言をコードにもドキュメントにも書かない。

### 1.4 サービス設計の制約
- 「6段階導入モデル」(①利用者→②支援者→③従業員→④企業幹部→⑤自治体職員→⑥自治体首長)を壊す設計をしない。既存ツール(LINE・POS・予約システム・自治体基幹システム)を置き換える実装は禁止。常に「見えない裏側」でSignal/Pulseを拾う設計にする。
- 課金は④(Coarc Micro)から発生させる。①〜③に課金機能を実装しない。
- コミュニティサイズの3制約(上限:現地パートナー1人が担える人数/下限:匿名化に必要な最低母数5〜20人/下限:Coarc Microが成立する事業者数3〜5)を超える設計をしない。
- 若者向け機能は「つながりを増やす」のではなく「干渉されない距離感を守る」設計にする。

### 1.5 匿名化・プライバシーの絶対ルール
- 個人が特定される可能性のある最小集計(目安: 母数20人未満)は、外部(企業・自治体)に共有する画面・APIレスポンスに含めない。
- 匿名化ロジック・伝播ロジックは基盤のコア部分であり、フィールド側(現地ITベンダー)の権限では変更できない設計にする。
- 個人情報・要配慮情報を含むテストデータをリポジトリやNotionにそのままコミットしない。ダミーデータを使う。

### 1.6 教育ツール(PBL Card Game)の位置づけ
- 【結】は各ロール(利用者・支援者・地域企業・自治体職員)向けの教育ツールとして `src/app/card-game` を持つ。3つの基盤を補完する一体の構成要素であり、無関係な別ツールとして扱わない。
- カード内容・ルールはNotion「教育DX 鹿児島高専 PJ活動ポータル」→「PBL Card Gameプロジェクト」(カードマスターDB・カードセット)が正。変更時はまずNotion側を更新し、その後コードに反映する。
- 想定フロー: カードゲームで体験 → 行政OS(`/gyosei`)で地域診断 → RunWith(`/runwith`)でIT基盤実装 → Notionにナレッジ保存(`/api/notion-save`, `/api/notion`)。新機能はこのフローのどこに位置づくかを意識する。

### 1.7 削除・破壊的操作に関するルール
- ファイル・Notionページ・DBレコード・デプロイ済み環境の削除は、実行前に必ずYoshitakaに確認する。
- `git push --force`、本番DBのマイグレーション、Vercel本番環境への直接デプロイなど、後戻りしにくい操作も事前確認する。

### 1.8 コミュニケーションルール
- やり取りはすべて日本語。専門用語は避け、中堅企業のIT担当者・自治体職員にも伝わる言葉を使う。
- コードにはコメントを入れ「何をしているか」を説明する(Yoshitakaはコード実装が久しぶりのため)。
- 長い説明より先に成果物(コード・ファイル・Notionページ)を作ることを優先する。ただし方針が大きく変わる判断は先に確認する。

---

## 2. Notion ページ構成ルール(最重要)

### 3セクション構造

```
🌱 RunWith Platform(ルートページ)
│
├── 🔧 標準基盤 | RunWith Platform 設計
│   ├── 💾 プラットフォーム データベース(標準13本)  ← 全自治体共通DB
│   ├── 📐 オントロジー設計(汎用フレームワーク)      ← 01_〜09_
│   ├── 🛠️ 実装・システム設計書                     ← 11_〜51_
│   └── 🔄 開発管理                                 ← Sprint / WBサマリー
│
├── 🏙️ 自治体・組織 展開ページ    ← ★ウィザードで新規自治体が追加される場所
│   ├── 📋 ヒアリング結果管理DB(全自治体共通)
│   ├── 🏙️ 霧島市役所 RunWith
│   ├── 🏝️ 屋久島町役場 RunWith
│   └── 🏢 NEC コーポレートIT部門 RunWith
│
└── 🎯 営業・提案活動
    ├── 📋 屋久島町 導入提案書(最新版)
    ├── 📋 霧島市 導入提案書
    ├── デモシナリオ / オペレーションガイド
    └── 屋久島ピッチ資料集(31_〜35_)/ SNS投稿シナリオ
```

### ページ作成のルール

| コンテンツの種類 | 作成場所 |
|---|---|
| 新規自治体ページ(ウィザード生成) | 🏙️ 自治体・組織 展開ページ 直下 |
| 自治体固有のDB・マニュアル | 各自治体ページ 直下 |
| AI自動生成コンテンツ(通知・予兆検知・WBサマリー) | 該当自治体ページ 直下 |
| 標準設計書・実装仕様書 | 🔧 標準基盤 > 🛠️ 実装・システム設計書 |
| Sprint記録・開発ログ | 🔧 標準基盤 > 🔄 開発管理 |
| 提案書・デモ資料・SNS素材 | 🎯 営業・提案活動 |
| **ルート直下には作らない** | ← これが混乱の原因になるため厳守 |

---

## 3. 主要 Notion ページ ID

```
ルートページ:              30e960a91e238118aa8bce863fa11b44
🔧 標準基盤:               347960a91e2381d9b1afde516f85d8ed
  💾 プラットフォームDB:    338960a91e23813f9402f53e5240e029
  📐 オントロジー設計:      33d960a91e23814991fcc425791667be
  🛠️ 実装・設計書:         347960a91e2381f5ba18dd3bc802f45a
  🔄 開発管理:             347960a91e2381faab8ae6f0ed5ab765
🏙️ 自治体・組織 展開ページ: 347960a91e2381088f69f359081ef39e  ← NOTION_PARENT_PAGE_ID
  📋 ヒアリング結果管理DB:  1a5be25296c24b5a909c14aad50d387c
  霧島市役所 RunWith:       33e960a91e23811184acf4044da2dd1b
  屋久島町役場 RunWith:     347960a91e2381ac9999d0bad0d8646e
  NEC コーポレートIT:       340960a91e2381a8be6fe82945e9a6ce
🎯 営業・提案活動:          347960a91e238138907add842dee8093
🗑️ 削除予定:               338960a91e2381679155f460c07a38bb
```

---

## 4. 環境変数(Vercel)

```
NOTION_PARENT_PAGE_ID = 347960a91e2381088f69f359081ef39e
                        (🏙️ 自治体・組織 展開ページ)
NOTION_HEARING_DB_ID  = 1a5be25296c24b5a909c14aad50d387c
```

---

## 5. コードの重要ファイル

```
src/app/api/runwith/roadmap-ai/route.ts      — AIロードマップ生成 API
src/app/api/notion/create-hearing/route.ts   — ヒアリング結果 Notion保存 API
src/app/(dashboard)/runwith/org-wizard/      — 組織設計ウィザード UI
src/config/features.ts                       — サイドメニュー定義
src/config/departments.ts                    — 部門設定
src/contexts/MunicipalityContext.tsx         — 選択中自治体のグローバル状態(Sprint #32〜)
src/components/layout/MunicipalitySelector.tsx — ヘッダーの自治体切り替えUI(Sprint #32〜)
src/config/municipalities.ts                 — 展開済み自治体マスタ定義(Sprint #32〜)
```

---

## 6. マルチテナント設計方針(Sprint #32〜 適用)

### 基本思想

RunWith Platform は **「1つのアプリで複数の自治体を安全に運用する」** マルチテナント構成を採る。
新しい自治体を追加するたびに別アプリをデプロイするのではなく、
選択中の自治体(テナント)に応じてデータを動的に切り替える。

### テナント識別の仕組み

```
ユーザーがヘッダーのドロップダウンで自治体を選択
  ↓
MunicipalityContext(React Context)に municipalityId を保存
  ↓
各ページ・コンポーネントが useContext(MunicipalityContext) で取得
  ↓
APIコール時に ?municipalityId=kirishima 等をクエリパラメータで渡す
  ↓
APIルートが Notion DB を municipalityName でフィルタリングして返す
```

### 自治体マスタ(`src/config/municipalities.ts`)

新しい自治体を展開する際は、このファイルに1件追加するだけでよい。

```typescript
export type Municipality = {
  id: string;              // 英字ID(例: 'kirishima', 'yakushima')
  name: string;            // 表示名(例: '霧島市役所')
  shortName: string;       // 短縮名(例: '霧島市')
  notionPageId: string;    // Notionの自治体ページID
  color: string;           // テーマカラー(Tailwind class)
  status: 'active' | 'coming' | 'demo'; // 運用状況
}
```

### APIルートの実装ルール

共通DBへのクエリは必ず `municipalityId` でフィルタリングすること。

```typescript
// ✅ 正しい実装(municipalityId でフィルタリング)
const { searchParams } = new URL(req.url)
const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'
const municipality = getMunicipalityById(municipalityId)

// Notion DB クエリに filter を追加
filter: {
  property: '自治体名',
  select: { equals: municipality.shortName }
}

// ❌ やってはいけない(全件取得して最新1件だけ返す)
sorts: [{ timestamp: 'created_time', direction: 'descending' }]
page_size: 1
```

### 自治体固有ページ(`/kirishima/*` 等)のルール

自治体固有の特殊機能(霧島市の廃棄物管理など)は `/[municipalityId]/*` 配下に置く。
共通機能(ダッシュボード・AI顧問・職員管理)は `/gyosei/*` に置き、
`municipalityId` コンテキストで動的に切り替える。

```
/gyosei/dashboard    → municipalityContext で自治体を切り替え(共通)
/gyosei/staff        → 同上(共通)
/kirishima/waste     → 霧島市固有(廃棄物管理)
/yakushima/tourism   → 屋久島固有(観光管理)※将来
```

### 新機能をどちらで作るかの判断基準

| 判断軸 | 共通機能(/gyosei) | 自治体固有(/kirishima, /yakushima) |
|---|---|---|
| 他自治体でも使える? | ✅ 汎用的 | ❌ その自治体特有 |
| データ構造が共通? | ✅ municipalityId で切替可 | ❌ DB設計が異なる |
| 実証段階? | 実証済み → 昇格 | まだ実験中 |
| 例 | 緊急時住民支援・週次WBサマリー | 霧島市の廃棄物最適化・財政健全化 |

具体的には以下の基準で判断する:
- **住民の困りに直結するもの** → 最初から `/gyosei/`(共通)
- **自治体固有の業務(廃棄物・観光・財政など)** → `/[id]/`(固有)で実証
- **固有で実証済みのもの** → `/gyosei/` に昇格候補

### 「固有 → 共通」への昇格プロセス

RunWith は **製品化の途中** にあるため、最初から完璧な共通設計はしない。
まず特定自治体で実証し、他自治体でも有効と判断したら共通化する。

```
① 自治体固有で作る(例: /kirishima/fiscal-health)
        ↓ 他自治体でも使えると判断
② municipalityId 対応にエンジンを改修
        ↓ 複数自治体で動作確認
③ /gyosei/* に昇格(全自治体共通メニューへ)
```

現時点で昇格候補(霧島市固有 → 将来共通化予定):
- `/kirishima/fiscal-health`(財政健全化)
- `/kirishima/infra-aging`(インフラ老朽化)
- `/kirishima/management-dashboard`(経営ダッシュボード)

### 新しい自治体を追加するときの手順

**⚠️ 必ず3ファイルすべてを更新すること(1つでも欠けるとサイドバーに表示されない)**

1. `src/config/municipalities.ts` に自治体を1件追加(マスタ情報・color・status)
2. `src/config/municipality-db-config.ts` に自治体の Notion DB ID マッピングを追加
3. `src/config/features.ts` の `municipality` グループにサイドバー表示モジュールを追加
4. Notion の「🏙️ 自治体・組織 展開ページ」直下に自治体ページを作成(ウィザード使用)
5. 共通DBの各レコードに「自治体名」プロパティが設定されていることを確認
6. 動作確認:自治体セレクターで切り替えてデータが分離されているかチェック
7. `npx tsc --noEmit` でエラーがないことを確認してから push

> **Sprint #73 以降はウィザード(org-wizard)が Step 10 で①②のコードを自動生成する。**
> ③の `features.ts` への追加は現時点では手動。将来のウィザード改善候補。

---

## 7. 左メニュー(Sidebar)設計ルール(Sprint #76〜)

### 関連ファイル

```
src/components/layout/Sidebar.tsx   — Sidebar 本体(Sprint #76 全面リデザイン)
src/config/features.ts              — メニュー項目の定義(ここだけ編集すればOK)
```

### features.ts のグループ構造

```
必須機能グループ(coreGroup)  → 常時展開・トグルなし
ai-ext グループ               → デフォルト閉じ(AI拡張機能)
municipality グループ         → デフォルト閉じ(自治体別リンク)
admin グループ                → デフォルト閉じ(運用管理)
```

### 新ページをサイドバーに追加するとき

`src/config/features.ts` に1件追記する。**これだけでサイドバーとホームに自動反映される。**

```typescript
{
  id: 'my-new-feature',
  label: '機能名',
  href: '/gyosei/my-new-feature',
  icon: SomeIcon,          // lucide-react のアイコン
  group: 'core',           // 'core' | 'ai-ext' | 'municipality' | 'admin'
  hidden: false,           // true にするとサイドバーから非表示(ページ自体は存在)
}
```

- **municipality グループのリンク** には必ず `?municipalityId=xxx` を付与する(Sprint #75)
  - 例: `href: '/gyosei/dashboard?municipalityId=kirishima'`
- `hidden: true` で非表示にできる(ページは動くが左メニューに出ない)
- `getVisiblePages()` が hidden なページを自動除外するため、削除は不要

### Sidebar が使われるレイアウト

| レイアウト | ファイル | Sidebar |
|---|---|---|
| 通常ダッシュボード | `src/app/(dashboard)/layout.tsx` | ✅ 左列に表示 |
| 霧島市専用 | 同上(`isKirishima` 分岐) | ✅ KirishimaSidebar |
| 屋久島専用 | 同上(`isYakushima` 分岐) | ✅ YakushimaSidebar |
| カードゲーム | `src/app/card-game/layout.tsx` | ❌ フルスクリーン(Sidebar なし) |
| Well-Being QUEST | `src/app/well-being-quest/layout.tsx` | ❌ フルスクリーン(Sidebar なし) |

---

## 8. 右メニュー(ChatPanel)設計ルール(Sprint #77〜)

### 関連ファイル

```
src/components/layout/ChatPanel.tsx  — ChatPanel 本体(Sprint #77 全面書き換え)
```

### 基本動作

- `usePathname()` で現在のURLを自動検出
- `PAGE_CONTEXTS` マップ(ファイル内に定義)から該当ページのコンテキストを取得
- ヘッダーは常に **「RunWithアシスタント」** で固定
- サブヘッダーに `ctx.pageTitle`(現在ページ名)を表示
- 入力欄のプレースホルダー:「このページの使い方を質問する...」

### 新ページを追加したら必ず PAGE_CONTEXTS にも追記する

`ChatPanel.tsx` 内の `PAGE_CONTEXTS` オブジェクトに1件追加する。

```typescript
'/gyosei/my-new-feature': {
  pageTitle: '機能名(日本語)',
  description: 'このページで何ができるかの説明(1〜2文)',
  systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「機能名」です。
このページでは〇〇ができます。
- 操作手順や注意点をここに書く
回答は400字以内。`,
  suggestions: ['よくある質問1', 'よくある質問2', 'よくある質問3'],
},
```

**⚠️ systemPrompt の冒頭は必ず `あなたはRunWith Platformの操作サポートAIです。現在のページは「...」です。` で始めること**

### ChatPanel が使われるレイアウト別の表示方式

| レイアウト | 表示方式 | ボタン色 | ファイル |
|---|---|---|---|
| 通常ダッシュボード | ヘッダーボタン → 右列パネル(flex内) | 青 `bg-blue-600` | `(dashboard)/layout.tsx` |
| 霧島市専用 | 同上 | ティール `bg-teal-600` | 同上(isKirishima分岐) |
| 屋久島専用 | 同上 | エメラルド `bg-emerald-600` | 同上(isYakushima分岐) |
| カードゲーム | 右下フローティングボタン → **固定オーバーレイ** | 青 `bg-blue-600` | `card-game/layout.tsx` |
| Well-Being QUEST | 右下フローティングボタン → **固定オーバーレイ** | エメラルド `bg-emerald-600` | `well-being-quest/layout.tsx` |

### ❌ やってはいけないこと

- `KirishimaChatPanel` は **廃止済み**(Sprint #77)。使わないこと
- 個別ページ(page.tsx)に ChatPanel を直接 import・配置しないこと
  → **必ずレイアウト(layout.tsx)が提供する**
- ページ追加時に PAGE_CONTEXTS の追記を忘れると、そのページで「汎用の説明」しか出ない

---

## 9. 開発スタイル

- コードには必ず日本語コメントを入れる
- 型チェックは `npx tsc --noEmit` で確認してから push
- git push は Cowork sandbox からも実行可能(GitHub Device Flow認証を設定済み)。ただし本番相当のpush・force pushは、実行前に必ずYoshitakaに一言確認してから行う
- `gh` コマンドはCowork sandboxにはインストールできない(配布元・`api.github.com`とも許可リストでブロックされているため)。リポジトリ作成・PR作成・Issue管理など`gh`が必要な操作は、YoshitakaのMacのターミナルから実行してもらう。Cowork側はコマンドを提示するところまでを担当する
- Notionページ削除は必ず確認を取ること
- 新自治体追加は必ず上記「マルチテナント設計方針」に従うこと

---

## 10. BCP確認ルール(Sprint #83〜 適用)

### 大きな開発の区切りごとに必ず実施すること

「大きな開発の区切り」とは以下のタイミングを指す:
- 複数Sprintにまたがる機能追加が完了したとき
- 新しい自治体を追加したとき
- APIルートやDBスキーマに大きな変更を加えたとき
- git push して Vercel へのデプロイが完了したとき

### チェックリスト

**① Notionバックアップ確認**
```bash
curl -X POST https://ai-saas-platform-gules.vercel.app/api/admin/notion-backup \
  -H "Authorization: Bearer $CRON_SECRET"
```
- 全タスク(自治体数 × 3DB)が success: true であることを確認
- または管理画面 `/admin/system-health` のバックアップ状態を目視確認

**② Coolify(Mac mini)での動作確認**
- Mac miniのターミナルで最新コードをCoolifyに再デプロイ(Coolify管理画面 → Deploy)
- `curl -I http://coolify-host.orb.local` で HTTP/1.1 200 OK を確認
- または `https://tubeless-premium-legal.ngrok-free.dev` でブラウザ確認(ngrok起動時のみ)

**③ LINE Webhook BCP確認(Webhook関連変更時のみ)**
```bash
curl -X POST https://tubeless-premium-legal.ngrok-free.dev/api/line-webhook \
  -H "Content-Type: application/json" \
  -d '{"destination":"test","events":[]}'
# → {"status":"ok","message":"LINE verify OK"} または {"error":"署名検証失敗"} が返れば疎通OK
```

### BCP環境の接続情報

| 項目 | 値 |
|------|-----|
| Coolify管理画面 | `http://coolify-host.orb.local:8000` |
| BCP URL(社内) | `http://coolify-host.orb.local` |
| BCP URL(外部公開) | `https://tubeless-premium-legal.ngrok-free.dev` |
| ngrok起動コマンド | `ngrok http --domain=tubeless-premium-legal.ngrok-free.dev http://coolify-host.orb.local` |
| LINE Webhook BCP URL | `https://tubeless-premium-legal.ngrok-free.dev/api/line-webhook` |

---

## 11. Claude API(Haiku)利用ルール(最重要)

### モデル固定
- 使用モデル: `claude-haiku-4-5-20251001`
- max_tokens: **4096固定**(Haikuの最大出力上限)

### JSON途中切れを防ぐための3原則

**① 入力データは上位12件以内に絞る**
```typescript
// ✅ 健全度・コスト等でソートして上位12件のみ送る
const topItems = [...allItems].sort(...).slice(0, 12)
```

**② 出力フォーマットを明示的に制限する**
```
提言は最大4件。各フィールドは下記形式:
{"priority":"高|中|低","title":"20文字以内","detail":"1〜2文","timing":"時期","costEffect":"金額概算"}
※ JSONのみ出力。説明文・コードブロック不要。簡潔さを最優先。
```

**③ stop_reason チェックでログ警告を出す**
```typescript
if (res.stop_reason === 'max_tokens') {
  console.warn('[engine] max_tokens に達したため出力が途中で切れている可能性があります')
}
```

### 新しいAIエンジンを作るときの標準テンプレート

```typescript
// ── プロンプト出力制限(必ずコピーして使う)──
const outputFormat = [
  '【出力形式(JSON)— 必ずこの形式のみで回答すること】',
  '{"summary":"2文以内","urgentItems":["最大3件・1文以内"],"recommendations":[最大4件',
  '  {"priority":"高|中|低","title":"20文字以内","detail":"1〜2文","timing":"時期","costEffect":"金額概算"}',
  '],"totalCostReduction":"年間約X万円","risks":["最大2件・1文以内"]}',
  '※ JSONのみ出力。説明文・コードブロック不要。簡潔さを最優先すること。',
].join('\n')
```
