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
```

---

## 開発スタイル

- コードには必ず日本語コメントを入れる
- 型チェックは `npx tsc --noEmit` で確認してから push
- git push は Yoshitaka がターミナルから手動実行（sandbox から不可）
- Notionページ削除は必ず確認を取ること
