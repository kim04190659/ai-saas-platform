// =====================================================
//  scripts/seed-staff-data.mjs
//  職員コンディション サンプルデータ投入スクリプト
//
//  ■ 使い方（ターミナルで実行）
//    node scripts/seed-staff-data.mjs
//
//  ■ 動作
//    5部門 × 6人 × 3日分 = 90件を
//    デプロイ済みのVercel APIにPOSTしてNotionに登録する。
//    日付は「今日を含む直近7日間」に自動設定される。
//
//  ■ 前提
//    Vercelにデプロイ済みであること（APIが稼働中）
//
//  ■ 投入先API
//    POST https://ai-saas-platform-gules.vercel.app/api/staff-condition
// =====================================================

const API_BASE = 'https://ai-saas-platform-gules.vercel.app'
const ENDPOINT = `${API_BASE}/api/staff-condition`

// ─── 日付ヘルパー ──────────────────────────────────────

/** 今日からN日前の日付文字列（yyyy-mm-dd）を返す */
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// 今週の3つの日付（6日前・3日前・今日）
const DATES = [daysAgo(6), daysAgo(3), daysAgo(0)]

// ─── サンプルデータ定義 ────────────────────────────────
//
// healthScore    : 体調 1(最悪)〜5(最良)
// workloadScore  : 業務負荷 1(楽)〜5(激務) ※低いほどWBスコアが上がる
// teamWBScore    : チームWB 1(最悪)〜5(最良)
// WBスコア計算式 : (体調-1)×10 + (5-負荷)×10 + (チームWB-1)×5
//
// ─────────────────────────────────────────────────────

const SAMPLE_STAFF = {

  // ── 🏛️ 行政 ─────────────────────────────────────────
  gyosei: [
    { staffName: '田中 一郎', department: '住民課',     h: 4, w: 3, t: 4, comment: '窓口対応が増えているが概ね安定' },
    { staffName: '佐藤 花子', department: '総務課',     h: 3, w: 4, t: 3, comment: '年度末の事務処理が重なっている' },
    { staffName: '鈴木 次郎', department: '福祉課',     h: 5, w: 2, t: 5, comment: '新年度体制がうまく回り始めた' },
    { staffName: '山田 三郎', department: '財政課',     h: 2, w: 5, t: 2, comment: '決算作業が佳境。休日出勤が続く' },
    { staffName: '中村 四郎', department: '情報政策課', h: 4, w: 3, t: 4, comment: 'DX推進プロジェクト順調' },
    { staffName: '小田 幸子', department: '企画課',     h: 3, w: 3, t: 5, comment: 'チームの雰囲気が良い' },
  ],

  // ── 🏫 教育 ─────────────────────────────────────────
  education: [
    { staffName: '田村 恵子', department: '小学校',           h: 3, w: 4, t: 3, comment: '新学期の保護者対応で多忙' },
    { staffName: '木村 誠',   department: '中学校',           h: 4, w: 3, t: 4, comment: '部活動指導も安定している' },
    { staffName: '小林 美咲', department: '高等学校',         h: 2, w: 5, t: 2, comment: '進路指導と授業準備が重なり限界に近い' },
    { staffName: '松本 正男', department: '教育委員会事務局', h: 4, w: 2, t: 5, comment: '新年度体制が整いスムーズ' },
    { staffName: '井上 和子', department: '給食センター',     h: 5, w: 3, t: 4, comment: 'アレルギー対応も問題なし' },
    { staffName: '渡辺 広人', department: '特別支援学校',     h: 3, w: 4, t: 3, comment: '個別支援計画の作成が山積み' },
  ],

  // ── 👮 警察・消防 ────────────────────────────────────
  safety: [
    { staffName: '高橋 剛',   department: '消防署 本署', h: 4, w: 4, t: 3, comment: '夜間出動が続いている' },
    { staffName: '伊藤 隆',   department: '警察署 交番', h: 3, w: 3, t: 4, comment: '地域見回りは安定' },
    { staffName: '斉藤 浩二', department: '救急隊',     h: 3, w: 5, t: 3, comment: '救急出動が増加傾向。疲労蓄積あり' },
    { staffName: '藤本 誠司', department: '消防署 分署', h: 5, w: 3, t: 4, comment: '体力維持良好' },
    { staffName: '村田 幸子', department: '地域課',     h: 4, w: 3, t: 5, comment: 'コミュニティ連携が充実' },
    { staffName: '大野 正志', department: '刑事課',     h: 2, w: 5, t: 2, comment: '複数案件が重なり精神的に消耗している' },
  ],

  // ── 🏥 医療・介護 ────────────────────────────────────
  healthcare: [
    { staffName: '石田 美穂', department: '地域包括支援センター', h: 4, w: 3, t: 4, comment: '相談件数が増加しているが対応できている' },
    { staffName: '岡本 由美', department: '訪問看護ステーション', h: 3, w: 4, t: 3, comment: '担当件数が増えてきた' },
    { staffName: '長谷川 誠', department: '特別養護老人ホーム', h: 3, w: 5, t: 2, comment: '夜勤が続き睡眠不足が深刻' },
    { staffName: '藤田 陽子', department: '介護予防センター',   h: 5, w: 2, t: 5, comment: '利用者の反応が良く励みになる' },
    { staffName: '中島 健太', department: '診療所',             h: 4, w: 3, t: 4, comment: '往診対応が順調' },
    { staffName: '木下 さゆり', department: '障害者支援施設',   h: 2, w: 4, t: 3, comment: '人手不足で一人当たりの負担が増えている' },
  ],

  // ── 🏗️ 公共設備 ─────────────────────────────────────
  infrastructure: [
    { staffName: '前田 義雄', department: '道路維持課',   h: 4, w: 3, t: 4, comment: '春の道路点検シーズンで忙しいが充実している' },
    { staffName: '野村 達也', department: '上水道課',     h: 3, w: 3, t: 4, comment: '老朽管更新工事の立会いが続く' },
    { staffName: '坂本 茂',   department: '電気設備課',   h: 4, w: 4, t: 3, comment: '停電対応で深夜呼び出しがあった' },
    { staffName: '島田 良子', department: 'ガス供給課',   h: 5, w: 2, t: 5, comment: '安全点検完了。問題なし' },
    { staffName: '福島 雄一', department: '下水道課',     h: 3, w: 4, t: 3, comment: '管渠調査の結果対応が増えそう' },
    { staffName: '久保田 亮', department: '橋梁管理課',   h: 2, w: 5, t: 2, comment: '老朽橋の緊急点検命令が出て手が足りない' },
  ],
}

// ─── WBスコア計算 ──────────────────────────────────────

function calcWB(h, w, t) {
  return (h - 1) * 10 + (5 - w) * 10 + (t - 1) * 5
}

// ─── 1件POSTする関数 ────────────────────────────────────

async function postRecord(record) {
  try {
    const res = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(record),
    })
    const json = await res.json()
    if (res.ok) {
      console.log(`  ✅ ${record.staffName}（${record.deptId} / ${record.recordDate}）WB: ${json.wellbeingScore}点`)
      return true
    } else {
      console.error(`  ❌ ${record.staffName} エラー:`, json.error)
      return false
    }
  } catch (e) {
    console.error(`  ❌ ${record.staffName} 通信エラー:`, e.message)
    return false
  }
}

// ─── メイン処理 ───────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  RunWith サンプルデータ投入スクリプト')
  console.log('='.repeat(60))
  console.log(`  投入先: ${ENDPOINT}`)
  console.log(`  日付範囲: ${DATES[0]} 〜 ${DATES[2]}`)
  console.log(`  件数予定: 5部門 × 6人 × 3日 = 90件\n`)

  let totalOK = 0
  let totalNG = 0

  for (const [deptId, staffList] of Object.entries(SAMPLE_STAFF)) {
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`  部門: ${deptId}（${staffList.length}人 × ${DATES.length}日 = ${staffList.length * DATES.length}件）`)
    console.log('─'.repeat(50))

    for (const date of DATES) {
      for (const staff of staffList) {
        // 日付ごとにスコアを少し変動させてリアリティを出す
        const variation = DATES.indexOf(date) - 1   // -1, 0, +1
        const h = Math.min(5, Math.max(1, staff.h + (Math.random() > 0.7 ? variation : 0)))
        const w = Math.min(5, Math.max(1, staff.w + (Math.random() > 0.7 ? -variation : 0)))
        const t = Math.min(5, Math.max(1, staff.t + (Math.random() > 0.8 ? variation : 0)))

        const record = {
          staffName:          staff.staffName,
          municipalityName:   '屋久島町',
          department:         staff.department,
          deptId:             deptId,
          healthScore:        Math.round(h),
          workloadScore:      Math.round(w),
          teamWellBeingScore: Math.round(t),
          comment:            date === DATES[2] ? staff.comment : '',   // 最新日のみコメントあり
          recordDate:         date,
        }

        const ok = await postRecord(record)
        if (ok) totalOK++; else totalNG++

        // API負荷軽減のため少し待機
        await new Promise(r => setTimeout(r, 200))
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`  完了！  ✅ 成功: ${totalOK}件  ❌ 失敗: ${totalNG}件`)
  console.log('='.repeat(60))
  console.log('\n次のステップ:')
  console.log('  1. https://ai-saas-platform-gules.vercel.app/api/cron/weekly-wb-summary')
  console.log('     にアクセスして週次サマリーを再生成してください。')
  console.log('  2. 生成されたNotionページで5部門のデータが反映されているか確認してください。\n')
}

main().catch(console.error)
