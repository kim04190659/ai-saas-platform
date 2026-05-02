# ── RunWith MCPゲートウェイ Dockerfile ──
# Coolify on Mac mini にデプロイする用

FROM node:20-alpine

WORKDIR /app

# 依存パッケージをインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド済みファイルをコピー（npm run build で dist/ を生成してからビルドすること）
COPY dist/ ./dist/

# サンプルデータフォルダをコピー（実運用では外部マウントに差し替える）
COPY data/ ./data/

# MCPサーバポートとREST APIポートを公開
EXPOSE 3100

# サーバ起動
CMD ["node", "dist/index.js"]
