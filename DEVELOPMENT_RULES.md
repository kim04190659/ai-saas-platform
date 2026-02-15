# 開発ルール

## 🎯 基本方針

このプロジェクトは、**高速で低コストなAI統合SaaSプラットフォーム**を目指します。

## 🤖 AIモデルの使用規則

### 必須ルール

**すべてのAI機能には Claude 3.5 Haiku を使用すること**

```typescript
// ✅ 正しい例
const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  messages: [...]
});

// ❌ 間違った例
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022', // Sonnetは使用しない
  max_tokens: 1024,
  messages: [...]
});
```

### 理由

1. **高速レスポンス**: Haikuはチャット機能に最適な応答速度
2. **低コスト**: Sonnetと比較して大幅にコスト削減
3. **十分な性能**: 一般的なチャット用途には十分な品質

### 例外

以下の場合のみ、他のモデルの使用を検討可能:

- 複雑な推論が必要な場合（要相談）
- 長文生成が必要な場合（要相談）

## 💻 コーディング規約

### 1. 言語設定

#### デフォルト言語: 日本語

```typescript
// ✅ 正しい例
<button>送信</button>
<p>メッセージを入力してください</p>

// ❌ 間違った例
<button>Send</button>
<p>Please enter a message</p>
```

#### コメント

```typescript
// ✅ 正しい例
// ユーザーメッセージを送信する関数
const sendMessage = async () => {
  // APIエンドポイントにリクエストを送信
  const response = await fetch('/api/chat', {...});
};

// ❌ 間違った例
// Function to send user message
const sendMessage = async () => {
  // Send request to API endpoint
  const response = await fetch('/api/chat', {...});
};
```

### 2. TypeScript

#### 型定義を必ず使用

```typescript
// ✅ 正しい例
interface Message {
  role: "user" | "assistant";
  content: string;
}

const messages: Message[] = [];

// ❌ 間違った例
const messages = []; // any型は避ける
```

### 3. コンポーネント設計

#### クライアントコンポーネント

```typescript
// ✅ 正しい例
"use client";

import { useState } from "react";

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  // ...
}
```

#### サーバーコンポーネント

```typescript
// ✅ 正しい例（'use client'なし）
export default function DashboardLayout({ children }) {
  return (
    <div>
      {children}
    </div>
  );
}
```

### 4. エラーハンドリング

#### 必須事項

1. **すべてのAPIコールにtry-catchを使用**
2. **エラーはユーザーに表示**
3. **コンソールにも詳細ログを出力**

```typescript
// ✅ 正しい例
try {
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message: input }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "APIエラーが発生しました");
  }

  setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
} catch (error) {
  console.error("Chat error:", error);
  const errorMessage =
    error instanceof Error ? error.message : "エラーが発生しました";
  setMessages((prev) => [
    ...prev,
    { role: "assistant", content: `❌ ${errorMessage}` },
  ]);
}
```

### 5. ファイル構成

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # ダッシュボード関連（グループルート）
│   ├── (auth)/            # 認証関連（グループルート）
│   ├── api/               # APIルート
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ルートページ
├── components/            # 再利用可能なコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   └── ui/               # UIコンポーネント
├── contexts/             # Reactコンテキスト
├── lib/                  # ユーティリティ、設定
└── types/                # TypeScript型定義
```

## 🎨 スタイリング

### Tailwind CSS v4を使用

```tsx
// ✅ 正しい例
<div className="flex h-screen">
  <div className="w-96 bg-white border-l">
    {/* コンテンツ */}
  </div>
</div>

// ❌ 間違った例（インラインスタイルは避ける）
<div style={{ display: 'flex', height: '100vh' }}>
  <div style={{ width: '384px', backgroundColor: 'white' }}>
    {/* コンテンツ */}
  </div>
</div>
```

## 🔐 環境変数

### 命名規則

- **公開変数**: `NEXT_PUBLIC_` プレフィックスを使用
- **秘密変数**: プレフィックスなし

```env
# ✅ 正しい例
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
ANTHROPIC_API_KEY=sk-ant-xxx

# ❌ 間違った例
SUPABASE_URL=https://xxx.supabase.co  # 公開変数にはNEXT_PUBLIC_が必要
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-xxx  # 秘密鍵を公開しない
```

## 📦 依存関係の管理

### パッケージの追加

```bash
# 本番依存関係
npm install package-name

# 開発依存関係
npm install -D package-name
```

### 更新前の確認

- 破壊的変更がないか確認
- テストを実行
- ローカルで動作確認

## 🧪 テスト

### 手動テスト（現在）

1. ローカル環境で動作確認
2. ビルドエラーがないか確認
3. 本番環境にデプロイ前に必ずテスト

### 今後の計画

- Jest + React Testing Libraryの導入
- E2Eテスト（Playwright）の導入

## 🚀 デプロイ

### デプロイ前チェックリスト

- [ ] `npm run build` が成功する
- [ ] ローカルで `npm start` が動作する
- [ ] 環境変数がすべて設定されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] UIテキストが日本語化されている

### Vercel環境変数

必須:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

## 📝 コミットメッセージ

### フォーマット

```
<type>: <subject>

<body>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル変更（機能に影響なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセスやツールの変更

### 例

```
fix: Claude HaikuモデルとエラーハンドリングUIの改善

- Claude SonnetからClaude Haiku (claude-3-5-haiku-20241022)に変更
- チャットパネルのエラーメッセージ表示機能を追加
- UIテキストを日本語化
```

## 🔄 ブランチ戦略

### 現在（シンプル）

- `main`: 本番環境

### 今後の計画

- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正

## 📚 参考資料

- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/)

## ⚠️ 禁止事項

1. **APIキーをコードにハードコーディングしない**
2. **console.logを本番環境に残さない**（エラーログは除く）
3. **any型の多用を避ける**
4. **未使用のimportを残さない**
5. **Claude Sonnetなど、Haiku以外のモデルを無断で使用しない**

## 🎓 学習リソース

- [Next.js 公式チュートリアル](https://nextjs.org/learn)
- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React 公式ドキュメント](https://react.dev/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
