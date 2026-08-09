// =====================================================
//  src/app/api/resas/route.ts
//  RESAS（地域経済分析システム／内閣府・経産省提供のオープンデータAPI）
//  人口構成データを取得する簡易プロキシ
//
//  ■ このAPIの役割
//    意見整合プラットフォームの画面イメージ案（/runwith/agreement/vision）で
//    「実際の公的統計が一画面で見える」ようにするための接続層。
//    RESASは総務省の外部サービスなので、RunWith側にDBを持たず
//    その場でRESASへ問い合わせて返すだけの薄いプロキシにしている。
//
//  ■ APIキーについて（重要）
//    RESAS APIの利用には無料のAPIキーが必要。
//    取得先: https://opendata.resas-portal.go.jp/form.html （自己登録・数分で取得可）
//    取得後、Vercelの環境変数に RESAS_API_KEY として設定すること。
//    未設定の間はこのAPIは available:false を返し、画面側は
//    「未接続」であることを正直に表示する（ダミー数値を実データのように
//    見せないため）。
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// RESASの「人口構成」レスポンス型（必要な部分のみ）
interface ResasPopulationResponse {
  statusCode?: number
  message?: string
  result?: {
    boundaryYear: number
    data: Array<{
      label: string
      data: Array<{ year: number; value: number; rate?: number }>
    }>
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const prefCode = searchParams.get('prefCode')
  const cityCode = searchParams.get('cityCode')

  if (!prefCode || !cityCode) {
    return NextResponse.json({ error: 'prefCode, cityCode は必須です' }, { status: 400 })
  }

  const apiKey = process.env.RESAS_API_KEY
  if (!apiKey) {
    // APIキー未設定 → 「未接続」であることを明示して返す
    return NextResponse.json({ available: false, reason: 'RESAS_API_KEY未設定' })
  }

  try {
    const url = `https://opendata.resas-portal.go.jp/api/v1/population/composition/perYear?prefCode=${prefCode}&cityCode=${cityCode}`
    const res  = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
      // 1時間キャッシュ（RESAS側のレート制限に配慮）
      next: { revalidate: 3600 },
    })
    const json: ResasPopulationResponse = await res.json()

    if (!res.ok || json.statusCode) {
      return NextResponse.json({ available: false, reason: json.message ?? 'RESAS APIエラー' })
    }

    const total = json.result?.data.find(d => d.label === '総人口')
    if (!total) {
      return NextResponse.json({ available: false, reason: '総人口データが見つかりません' })
    }

    // 5年刻みだけ抜き出して画面表示を軽くする
    const series = total.data
      .filter(d => d.year % 5 === 0)
      .map(d => ({ year: d.year, value: d.value }))

    return NextResponse.json({
      available:    true,
      boundaryYear: json.result?.boundaryYear,
      series,
    })
  } catch (e) {
    return NextResponse.json({ available: false, reason: e instanceof Error ? e.message : 'RESAS取得に失敗しました' })
  }
}
