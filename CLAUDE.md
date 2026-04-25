# RunWith Platform — Claude Cowork 作業ガイド

## プロジェクト概要

自治体向けWell-Being × SDL × DX基盤。
住民LINE相談 → 職員エクセレントサービス → Notion蓄積 → AI政策提言 のサイクルを実現。

- **Webアプリ**: Next.js 15 / TypeScript / Vercel
- **ナレッジ基盤**: Notion（MCP連携済み）
- **AI**: Claude API（Anthropic）
- **担当**: Yoshitaka（NEC DX/AX推進担当）

---

## Notion ページ構成ルール（最重要）

### 3セクション構造

```
🌱 RunWith Platform（ルートページ）
│
├── 🔧 標準基盤 | RunWith Platform 設計
│   ├── 💾 プラットフォーム データベース（標準13本）  ← 全自治体共通DB
│   ├── 📐 オントロジー設計（汎用フレームワーク）      ← 01_〜09_
│   ├── 🛠️ 実装・システム設計書                     ← 11_〜51_
│   └── 🔄 開発管理                                 ← Sprint / WBサマリー
│
├── 🏙️ 自治体・組織 展開ページ    ← ★ウィザードで新規自治体が追加される場所
│   ├── 📋 ヒアリング結果管理DB（全自治体共通）
│   ├── 🏙️ 霧島市役所 RunWith
│   ├── 🏝️ 屋久島町役場 RunWith
│   └── 🏢 NEC コーポレートIT部門 RunWith
│
└── 🎯 営業・提案活動
    ├── 📋 屋久島町 導入提案書（最新版）
    ├── 📋 霧島市 導入提案書
    ├── デモシナリオ / オペレーションガイド
    └── 屋久島ピッチ資料集（31_〜35_）/ SNS投稿シナリオ
```

### ページ作成のルール

| コンテンツの種類 | 作成場所 |
|---|---|
| 新規自治体ページ（ウィザード生成） | 🏙️ 自治体・組織 展開ページ 直下 |
| 自治体固有のDB・マニュアル | 各自治体ページ 直下 |
| AI自動生成コンテンツ（通知・予兆検知・WBサマリー） | 該当自治体ページ 直下 |
| 標準設計書・実装仕様書 | 🔧 標準基盤 > 🛠️ 実装・システム設計書 |
| Sprint記録・開発ログ | 🔧 標準基盤 > 🔄 開発管理 |
| 提案書・デモ資料・SNS素材 | 🎯 営業・提案活動 |
| **ルート直下には作らない** | ← これが混乱の原因になるため厳守 |

---

## 主要 Notion ページ ID

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

## 環境変数（Vercel）

```
NOTION_PARENT_PAGE_ID = 347960a91e2381088f69f359081ef39e
                        （🏙️ 自治体・組織 展開ページ）
NOTION_HEARING_DB_ID  = 1a5be25296c24b5a909c14aad50d387c
```

---

## コードの重要ファイル

```
src/app/api/runwith/roadmap-ai/route.ts      — AIロードマップ生成 API
src/app/api/notion/create-hearing/route.ts   — ヒアリング結果 Notion保存 API
src/app/(dashboard)/runwith/org-wizard/      — 組織設計ウィザード UI
src/config/features.ts                       — サイドメニュー定義
src/config/departments.ts                    — 部門設定
src/contexts/MunicipalityContext.tsx         — 選択中自治体のグローバル状態（Sprint #32〜）
src/components/layout/MunicipalitySelector.tsx — ヘッダーの自治体切り替えUI（Sprint #32〜）
src/config/municipalities.ts                 — 展開済み自治体マスタ定義（Sprint #32〜）
```

---

## マルチテナント設計方針（Sprint #32〜 適用）

### 基本思想

RunWith Platform は **「1つのアプリで複数の自治体を安全に運用する」** マルチテナント構成を採る。
新しい自治体を追加するたびに別アプリをデプロイするのではなく、
選択中の自治体（テナント）に応じてデータを動的に切り替える。

### テナント識別の仕組み

```
ユーザーがヘッダーのドロップダウンで自治体を選択
  ↓
MunicipalityContext（React Context）に municipalityId を保存
  ↓
各ページ・コンポーネントが useContext(MunicipalityContext) で取得
  ↓
APIコール時に ?municipalityId=kirishima 等をクエリパラメータで渡す
  ↓
APIルートが Notion DB を municipalityName でフィルタリングして返す
```

### 自治体マスタ（`src/config/municipalities.ts`）

新しい自治体を展開する際は、このファイルに1件追加するだけでよい。

```typescript
export type Municipality = {
  id: string;              // 英字ID（例: 'kirishima', 'yakushima'）
  name: string;            // 表示名（例: '霧島市役所'）
  shortName: string;       // 短縮名（例: '霧島市'）
  notionPageId: string;    // Notionの自治体ページID
  color: string;           // テーマカラー（Tailwind class）
  status: 'active' | 'coming' | 'demo'; // 運用状況
}
```

### APIルートの実装ルール

共通DBへのクエリは必ず `municipalityId` でフィルタリングすること。

```typescript
// ✅ 正しい実装（municipalityId でフィルタリング）
const { searchParams } = new URL(req.url)
const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'
const municipality = getMunicipalityById(municipalityId)

// Notion DB クエリに filter を追加
filter: {
  property: '自治体名',
  select: { equals: municipality.shortName }
}

// ❌ やってはいけない（全件取得して最新1件だけ返す）
sorts: [{ timestamp: 'created_time', direction: 'descending' }]
page_size: 1
```

### 自治体固有ページ（`/kirishima/*` 等）のルール

自治体固有の特殊機能（霧島市の廃棄物管理など）は `/[municipalityId]/*` 配下に置く。
共通機能（ダッシュボード・AI顧問・職員管理）は `/gyosei/*` に置き、
`municipalityId` コンテキストで動的に切り替える。

```
/gyosei/dashboard    → municipalityContext で自治体を切り替え（共通）
/gyosei/staff        → 同上（共通）
/kirishima/waste     → 霧島市固有（廃棄物管理）
/yakushima/tourism   → 屋久島固有（観光管理）※将来
```

### 新しい自治体を追加するときの手順

1. `src/config/municipalities.ts` に自治体を1件追加
2. `src/config/features.ts` の `municipality` グループにモジュール追加
3. Notion の「🏙️ 自治体・組織 展開ページ」直下に自治体ページを作成（ウィザード使用）
4. 共通DBの各レコードに「自治体名」プロパティが設定されていることを確認
5. 動作確認：自治体セレクターで切り替えてデータが分離されているかチェック
6. `npx tsc --noEmit` でエラーがないことを確認してから push

---

## 開発スタイル

- コードには必ず日本語コメントを入れる
- 型チェックは `npx tsc --noEmit` で確認してから push
- git push は Yoshitaka がターミナルから手動実行（sandbox から不可）
- Notionページ削除は必ず確認を取ること
- 新自治体追加は必ず上記「マルチテナント設計方針」に従うこと
