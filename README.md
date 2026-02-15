# AI SaaSプラットフォーム

生成AI(Claude API)を統合したWebサービス基盤

## 📋 プロジェクト概要

AI統合SaaSプラットフォームは、Anthropic Claude APIを活用したリアルタイムチャット機能を備えたWebアプリケーションです。

### 主な機能

- ✅ 認証・ログイン機能（Supabase Auth連携準備完了）
- ✅ 左サイドメニュー（ダッシュボード、設定、ログアウト）
- ✅ メインコンテンツエリア（レスポンシブデザイン）
- ✅ **Claude Haiku API連携** - リアルタイムAIチャット機能
- ✅ チャットパネルの表示・非表示切り替え
- ✅ チャット履歴管理

## 🛠️ 技術スタック

### Frontend

- **Next.js 16.1.6** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide React** (アイコン)

### Backend/Infrastructure

- **Supabase** (PostgreSQL, Auth, Storage)
- **Anthropic Claude Haiku API** (AIチャット)
- **Vercel** (デプロイ)

### Dev Tools

- **GitHub**
- **ESLint + Prettier**

## 🚀 開発ルール

### AIモデルの使用

**必須**: すべてのAI機能には **Claude 3.5 Haiku** (`claude-3-5-haiku-20241022`) を使用すること

理由:

- 高速なレスポンス時間
- 低コスト
- チャット機能に最適なパフォーマンス

### コーディング規約

1. **言語**: デフォルトは日本語
   - UIテキスト: 日本語
   - コメント: 日本語
   - ドキュメント: 日本語

2. **コンポーネント設計**
   - クライアントコンポーネントには `'use client'` を明記
   - 再利用可能なコンポーネントは `src/components/` に配置

3. **エラーハンドリング**
   - APIエラーは必ずユーザーに表示
   - コンソールにも詳細ログを出力

## 📂 主要ファイル構成

```
src/
├── app/
│   ├── (dashboard)/          # ダッシュボード関連ページ
│   │   ├── page.tsx          # メインダッシュボード
│   │   ├── settings/         # 設定ページ
│   │   └── users/            # ユーザー管理ページ
│   ├── (auth)/               # 認証関連ページ
│   │   └── login/            # ログインページ
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # Claude Haiku APIエンドポイント
│   ├── layout.tsx            # ルートレイアウト
│   ├── page.tsx              # ルートページ
│   └── globals.css           # グローバルスタイル
├── components/
│   └── layout/
│       ├── Sidebar.tsx       # サイドバーコンポーネント
│       └── ChatPanel.tsx     # AIチャットパネル
├── contexts/
│   └── LanguageContext.tsx   # 言語管理コンテキスト
└── lib/
    └── supabase.ts           # Supabaseクライアント設定
```

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### 4. ビルド

```bash
npm run build
```

### 5. 本番環境の起動

```bash
npm start
```

## 📝 変更履歴

### 2026-02-15: Claude Haikuへの移行と404エラー修正

#### 修正内容

1. **404エラーの解決**
   - ルートページ(`src/app/page.tsx`)を作成
   - next-intlミドルウェアを削除してシンプルな構成に変更
   - 日本語をデフォルト言語に設定

2. **AIモデルの変更**
   - Claude Sonnet → **Claude Haiku** (`claude-3-5-haiku-20241022`)
   - 理由: 高速レスポンス、低コスト、チャット機能に最適

3. **エラーハンドリングの改善**
   - チャットパネルにエラーメッセージ表示機能を追加
   - APIエラー時にユーザーフレンドリーなメッセージを表示

4. **UI日本語化**
   - ChatPanelのすべてのテキストを日本語化
   - プレースホルダー、ボタンテキスト、ステータスメッセージ

#### 技術的な詳細

**修正前の問題:**

- Vercelデプロイ時に404エラー
- Claude Sonnetモデル名が古く、404エラー
- エラーが発生してもユーザーに表示されない

**修正後:**

- ルートページが正常に表示
- Claude Haikuで高速なAI応答
- エラーメッセージがチャットパネルに表示される

#### 影響範囲

- `src/app/page.tsx` - 新規作成
- `src/app/layout.tsx` - 日本語化
- `src/app/api/chat/route.ts` - モデル変更
- `src/components/layout/ChatPanel.tsx` - エラーハンドリング追加、日本語化
- `src/middleware.ts` - 削除
- `next.config.ts` - next-intlプラグイン削除

## 🌐 デプロイ

### Vercel

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
3. デプロイ

**本番URL**: https://ai-saas-platform-gules.vercel.app

## 📚 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

## 📄 ライセンス

Private

## 👥 開発者

- GitHub: [@kim04190659](https://github.com/kim04190659)
- Repository: [ai-saas-platform](https://github.com/kim04190659/ai-saas-platform)
