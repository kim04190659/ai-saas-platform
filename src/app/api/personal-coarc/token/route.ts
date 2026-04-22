// Personal Coarc トークン管理API
// APIキーをAES-256-CBCで暗号化/復号する

import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// 32バイトの暗号化キーを環境変数から生成
const RAW = process.env.PERSONAL_COARC_SECRET ?? 'fallback-secret-key-for-local-dev!!'
const KEY = Buffer.from(RAW.padEnd(32, '0').slice(0, 32))

// APIキーをAES-256-CBCで暗号化してBase64URLトークンに変換
function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', KEY, iv)
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])
  // iv + 暗号文をBase64URLエンコード（URLパラメータ対応）
  return Buffer.concat([iv, encrypted])
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Base64URLトークンを復号してAPIキーを取得
function decrypt(token: string): string {
  const buf = Buffer.from(
    token.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  )
  // 先頭16バイトがiv、残りが暗号文
  const iv = buf.subarray(0, 16)
  const decipher = createDecipheriv('aes-256-cbc', KEY, iv)
  return Buffer.concat([
    decipher.update(buf.subarray(16)),
    decipher.final(),
  ]).toString('utf8')
}

// POST: APIキー → 暗号化トークン生成
export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json()
    // APIキーの形式チェック
    if (!apiKey?.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: 'sk-ant- で始まるClaude APIキーを入力してください' },
        { status: 400 }
      )
    }
    const token = encrypt(apiKey)
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json(
      { error: 'トークン生成に失敗しました' },
      { status: 500 }
    )
  }
}

// GET: 暗号化トークン → APIキー復号
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token') ?? ''
    if (!token) {
      return NextResponse.json(
        { error: 'token パラメータが必要です' },
        { status: 400 }
      )
    }
    const apiKey = decrypt(token)
    // 復号結果の検証
    if (!apiKey.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 400 }
      )
    }
    return NextResponse.json({ apiKey })
  } catch {
    return NextResponse.json(
      { error: 'トークンの復号に失敗しました' },
      { status: 400 }
    )
  }
}
