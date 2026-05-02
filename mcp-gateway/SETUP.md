# RunWith MCPゲートウェイ セットアップガイド

## 概要

Mac mini（Coolify）上でローカルMCPサーバを動かし、
オンプレデータをClaudeから安全に参照できるようにする。

**生データはMac miniから外に出ません。**
Claudeには匿名化・集計済みの結果だけが渡されます。

---

## 1. Mac miniでの初期セットアップ

```bash
# プロジェクトのルートに移動
cd ~/Cowork/ai-saas-platform/mcp-gateway

# 依存パッケージのインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env
# → .env を編集して GATEWAY_API_KEY を設定すること

# ビルド
npm run build

# 起動（REST APIモード）
npm start
# → http://localhost:3100 で起動
```

---

## 2. Coolify でのデプロイ（本番運用）

```bash
# mcp-gateway ディレクトリでビルド
cd mcp-gateway
npm run build

# Coolify管理画面 → 新規アプリ → Dockerfile でデプロイ
# ポート: 3100
# 環境変数: GATEWAY_API_KEY, DATA_ROOT, PORT を設定
```

---

## 3. Claude Desktop への接続設定

Claude Desktop の設定ファイルに以下を追加する：

**macOS の場合:**
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "runwith-local-gateway": {
      "command": "node",
      "args": ["/Users/kimurayoshitaka/Cowork/ai-saas-platform/mcp-gateway/dist/index.js"],
      "env": {
        "DATA_ROOT": "/Users/kimurayoshitaka/Cowork/ai-saas-platform/mcp-gateway/data",
        "GATEWAY_API_KEY": "your-secret-key-here",
        "PORT": "3100"
      }
    }
  }
}
```

設定後、Claude Desktopを再起動すると
「runwith-local-gateway」ツールが使えるようになる。

---

## 4. Vercel（RunWithアプリ）への環境変数設定

Vercel の環境変数に以下を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `GATEWAY_BASE_URL` | `https://tubeless-premium-legal.ngrok-free.dev` | ngrok URL |
| `GATEWAY_API_KEY` | （Mac miniの.envと同じ値） | 認証キー |

---

## 5. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3100/health
# → {"status":"ok","service":"runwith-mcp-gateway","version":"1.0.0"}

# データソース一覧（REST API）
curl http://localhost:3100/api/datasources \
  -H "x-gateway-api-key: your-secret-key-here"

# CSVクエリ（REST API）
curl -X POST http://localhost:3100/api/query/csv \
  -H "Content-Type: application/json" \
  -H "x-gateway-api-key: your-secret-key-here" \
  -d '{"datasource_id": "kirishima/residents-stats", "filter": {"地区名": "国分中央"}}'

# ngrok経由の動作確認（外部から）
curl https://tubeless-premium-legal.ngrok-free.dev/health
```

---

## 6. 新しいデータソースの追加方法

1. `data/` フォルダに CSV または Excel ファイルを配置
   - 例: `data/kirishima/school-attendance.csv`

2. `src/datasource-registry.ts` に1件追記

```typescript
{
  id: 'kirishima/school-attendance',
  label: '霧島市 学校出欠状況',
  description: '市立小中学校の月別出欠統計（匿名集計）',
  type: 'csv',
  org: '学校',
  municipality: '霧島市',
  filePath: 'kirishima/school-attendance',
  columns: ['年月', '学校名', '学年', '出席率', '不登校件数', '早退件数'],
  sensitiveColumns: [],
}
```

3. `npm run build` して再起動

これだけで Claude から参照できるようになる。

---

## セキュリティ上の注意

- `.env` は絶対に git に含めないこと（`.gitignore` に追記済み）
- `GATEWAY_API_KEY` は推測されにくい長い文字列にすること
- `data/` フォルダには匿名化済みCSV・集計データのみ配置すること
- 個人情報を含むデータは `sensitiveColumns` に必ず登録すること
