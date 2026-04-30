/**
 * /gyosei/dashboard
 * 行政OS — 地域診断ダッシュボード（マルチテナント対応版）
 *
 * Sprint #3  : 初期実装（屋久島固定）
 * Sprint #32 : useMunicipality() で自治体切り替えに対応
 *              霧島市データを追加、全表示を動的化
 * Sprint #74 : useSearchParams() でURLパラメータから自動切り替え対応
 *
 * ■ データ方針
 *   各自治体の診断データはこのファイルの MUNICIPALITY_DATA に静的定義する。
 *   将来的に Notion DB 化する場合は getDataForMunicipality() を API 呼び出しに差し替えればよい。
 *
 * ■ dynamic = 'force-dynamic' について
 *   useSearchParams() はブラウザ側でしか動作しないため、
 *   Next.js のビルド時プリレンダリングをスキップする必要がある。
 *   このページはログイン後のダッシュボードなので静的生成不要。
 */

'use client';

// ルートセグメント設定：プリレンダリングを無効化（useSearchParams使用のため必須）
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';  // Sprint #74: URLパラメータ監視
import { useScenario } from '@/contexts/ScenarioContext';
import { useMunicipality } from '@/contexts/MunicipalityContext';
import Link from 'next/link';
import {
  Zap,
  TrendingDown,
  Users,
  Heart,
  ChevronRight,
  MapPin,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// ─── 自治体診断データの型 ─────────────────────────────────

type PopulationPoint = { year: number; population: number };

type MunicipalityDiagnosisData = {
  name: string;
  prefecture: string;
  energySelfSufficiency: number;
  fiscalStrength: number;     // 表示用スコア（0〜100）
  fiscalIndex: number;        // 実際の財政力指数
  populationViability: number;
  wellBeingScore: number;
  currentPopulation: number;
  agingRate: number;
  populationForecast: PopulationPoint[];
  survivalRank: 'S' | 'A' | 'B' | 'C' | 'D';
  comments: {
    energy: string;
    fiscal: string;
    population: string;
    wellbeing: string;
  };
  aiPromptContext: string;
};

// ─── 自治体診断データ定義 ─────────────────────────────────

const MUNICIPALITY_DATA: Record<string, MunicipalityDiagnosisData> = {

  // ── 屋久島町 ──────────────────────────────────────────
  yakushima: {
    name: '屋久島町',
    prefecture: '鹿児島県',
    energySelfSufficiency: 99,
    fiscalStrength: 18,
    fiscalIndex: 0.18,
    populationViability: 53,
    wellBeingScore: 72,
    currentPopulation: 12200,
    agingRate: 39.2,
    populationForecast: [
      { year: 2024, population: 12200 },
      { year: 2034, population: 10100 },
      { year: 2044, population: 8200 },
      { year: 2054, population: 6500 },
    ],
    survivalRank: 'B',
    comments: {
      energy:     '水力発電でほぼ100%自給。脱炭素・エネルギー安全保障で全国トップ級',
      fiscal:     '全国平均(0.51)の1/3。国からの地方交付税に大きく依存している状態',
      population: '2054年に約6,500人（現在の53%）と推計。行政サービス維持が課題',
      wellbeing:  '豊かな自然・世界遺産・観光業が高スコアを支える。住民満足度は比較的高い',
    },
    aiPromptContext: `
【屋久島町データ】
- 現在人口: 12,200人（高齢化率 39.2%）
- 財政力指数: 0.18（全国平均0.51の約1/3。交付税依存度が高い）
- エネルギー自給率: 99%（水力発電）
- 2054年推計人口: 6,500人（現在の53%）
- 生存可能性ランク: B（要注意）
強み: 世界自然遺産、エネルギー自立、観光資源
弱み: 財政力低下、人口減少加速、IT人材不足`,
  },

  // ── 霧島市 ────────────────────────────────────────────
  kirishima: {
    name: '霧島市',
    prefecture: '鹿児島県',
    energySelfSufficiency: 45,
    fiscalStrength: 49,
    fiscalIndex: 0.49,
    populationViability: 75,
    wellBeingScore: 68,
    currentPopulation: 119000,
    agingRate: 31.0,
    populationForecast: [
      { year: 2024, population: 119000 },
      { year: 2034, population: 110000 },
      { year: 2044, population: 100000 },
      { year: 2054, population: 89000 },
    ],
    survivalRank: 'A',
    comments: {
      energy:     '地熱・太陽光等で約45%自給。霧島温泉を活かした地熱発電のさらなる活用が課題',
      fiscal:     '財政力指数0.49は全国平均水準。航空宇宙・観光・農業の多角的産業基盤が強み',
      population: '2054年に約89,000人（現在の75%）と推計。県内主要都市として中長期の人口維持が鍵',
      wellbeing:  '霧島温泉・自然公園・航空宇宙産業が生活満足度を支える。職員定着率の向上が課題',
    },
    aiPromptContext: `
【霧島市データ】
- 現在人口: 119,000人（高齢化率 31.0%）
- 財政力指数: 0.49（全国平均水準。比較的安定）
- エネルギー自給率: 45%（地熱・太陽光）
- 2054年推計人口: 89,000人（現在の75%）
- 生存可能性ランク: A（良好）
強み: 航空宇宙産業・霧島温泉・農業（茶・畜産）・財政安定
弱み: 高齢化進行、IT人材確保、中山間地域の過疎化`,
  },

  // ── 四万十市（高知県）── Sprint #73 追加 ───────────────
  shimanto: {
    name: '四万十市',
    prefecture: '高知県',
    energySelfSufficiency: 38,
    fiscalStrength: 22,
    fiscalIndex: 0.22,
    populationViability: 48,
    wellBeingScore: 65,
    currentPopulation: 31000,
    agingRate: 40.2,
    populationForecast: [
      { year: 2024, population: 31000 },
      { year: 2034, population: 26000 },
      { year: 2044, population: 21000 },
      { year: 2054, population: 15000 },
    ],
    survivalRank: 'B',
    comments: {
      energy:     '四万十川の水力・太陽光で約38%自給。清流を活かした小水力発電の拡充が脱炭素の鍵',
      fiscal:     '財政力指数0.22は全国平均の半分以下。地方交付税への依存が高く、産業振興が急務',
      population: '2054年に約15,000人（現在の48%）と推計。高齢化率40%超で医療・介護の負荷増大が懸念',
      wellbeing:  '四万十川・豊かな自然・食文化が生活満足度を支える。移住促進と若者定着が課題',
    },
    aiPromptContext: `
【四万十市データ】
- 現在人口: 31,000人（高齢化率 40.2%）
- 財政力指数: 0.22（全国平均0.51の約半分以下。交付税依存度が非常に高い）
- エネルギー自給率: 38%（水力・太陽光）
- 2054年推計人口: 15,000人（現在の48%）
- 生存可能性ランク: B（要注意）
強み: 四万十川・豊かな自然・農林水産業・移住人気エリア
弱み: 財政力低下、人口減少加速、医療介護資源不足、IT人材不足`,
  },

  // ── 海士町（島根県隠岐諸島）── Sprint #64 ───────────
  amacho: {
    name: '海士町',
    prefecture: '島根県',
    energySelfSufficiency: 55,
    fiscalStrength: 13,
    fiscalIndex: 0.13,
    populationViability: 42,
    wellBeingScore: 71,
    currentPopulation: 2300,
    agingRate: 45.5,
    populationForecast: [
      { year: 2024, population: 2300 },
      { year: 2034, population: 1900 },
      { year: 2044, population: 1500 },
      { year: 2054, population: 970 },
    ],
    survivalRank: 'C',
    comments: {
      energy:     '再生可能エネルギーで約55%自給。離島の地理的優位を活かした太陽光・風力の拡充が鍵',
      fiscal:     '財政力指数0.13は全国最低水準。ふるさと納税・移住施策で自主財源確保が急務',
      population: '2054年に約970人（現在の42%）と推計。少子高齢化が加速し行政サービスの持続が最大課題',
      wellbeing:  '「隠岐の島」の豊かな自然・食文化・コミュニティが高スコアを支える。移住者の定着率向上が鍵',
    },
    aiPromptContext: `
【海士町データ】
- 現在人口: 2,300人（高齢化率 45.5%）
- 財政力指数: 0.13（全国最低水準。交付税・ふるさと納税に大きく依存）
- エネルギー自給率: 55%（太陽光・風力）
- 2054年推計人口: 970人（現在の42%）
- 生存可能性ランク: C（危機的）
強み: 世界的注目の移住先、隠岐の自然・食文化、コミュニティの強さ
弱み: 超高齢化、財政力低下、医療・介護資源不足、島内IT人材皆無`,
  },

  // ── 五島市（長崎県五島列島）── Sprint #65 ──────────
  goto: {
    name: '五島市',
    prefecture: '長崎県',
    energySelfSufficiency: 35,
    fiscalStrength: 17,
    fiscalIndex: 0.17,
    populationViability: 44,
    wellBeingScore: 63,
    currentPopulation: 32000,
    agingRate: 40.8,
    populationForecast: [
      { year: 2024, population: 32000 },
      { year: 2034, population: 26500 },
      { year: 2044, population: 21000 },
      { year: 2054, population: 14000 },
    ],
    survivalRank: 'C',
    comments: {
      energy:     '風力発電で約35%自給。五島沖の浮体式洋上風力は全国先進事例。100%自給も射程内',
      fiscal:     '財政力指数0.17は全国平均の1/3以下。島しょ部の高コスト構造が財政を圧迫している',
      population: '2054年に約14,000人（現在の44%）と推計。医師不足・高齢化で在宅医療の限界が深刻',
      wellbeing:  '自然・食文化・信仰（教会群）が生活満足度を支える。若者の島外流出が止まらない',
    },
    aiPromptContext: `
【五島市データ】
- 現在人口: 32,000人（高齢化率 40.8%）
- 財政力指数: 0.17（全国平均の1/3以下。島しょ部コスト高）
- エネルギー自給率: 35%（風力・太陽光。洋上風力で拡大中）
- 2054年推計人口: 14,000人（現在の44%）
- 生存可能性ランク: C（危機的）
強み: 浮体式洋上風力の先進地、世界遺産の教会群、豊富な水産物
弱み: 医師不足、高齢化率40%超、財政力脆弱、島外への若者流出`,
  },

  // ── 輪島市（石川県）── Sprint #67 ─────────────────
  wajima: {
    name: '輪島市',
    prefecture: '石川県',
    energySelfSufficiency: 22,
    fiscalStrength: 19,
    fiscalIndex: 0.19,
    populationViability: 38,
    wellBeingScore: 52,
    currentPopulation: 24000,
    agingRate: 43.0,
    populationForecast: [
      { year: 2024, population: 24000 },
      { year: 2034, population: 18500 },
      { year: 2044, population: 13500 },
      { year: 2054, population: 9200 },
    ],
    survivalRank: 'D',
    comments: {
      energy:     '能登半島地震でインフラ損傷。復旧後は再エネ導入による強靭化を目指している段階',
      fiscal:     '震災復興で特別交付税を受けながらも、財政力指数0.19は脆弱。産業復興が急務',
      population: '2054年に約9,200人（現在の38%）と推計。震災後の転出加速が懸念される深刻な状況',
      wellbeing:  '輪島塗・朝市・能登の豊かな文化が誇り。震災からの復興が住民Well-Beingの最重要テーマ',
    },
    aiPromptContext: `
【輪島市データ】
- 現在人口: 24,000人（高齢化率 43.0%）
- 財政力指数: 0.19（震災復興特別交付税受給中。産業再建が急務）
- エネルギー自給率: 22%（地震でインフラ損傷。復旧・再エネ化を推進中）
- 2054年推計人口: 9,200人（現在の38%）
- 生存可能性ランク: D（限界）
強み: 輪島塗・朝市の伝統産業、国内外からの復興支援、能登の自然・食文化
弱み: 2024年能登半島地震で甚大被害、震災後の転出加速、財政力脆弱、高齢化率43%`,
  },

  // ── 西粟倉村（岡山県英田郡）── Sprint #66 ─────────
  nishiawakura: {
    name: '西粟倉村',
    prefecture: '岡山県',
    energySelfSufficiency: 70,
    fiscalStrength: 12,
    fiscalIndex: 0.12,
    populationViability: 53,
    wellBeingScore: 76,
    currentPopulation: 1400,
    agingRate: 37.5,
    populationForecast: [
      { year: 2024, population: 1400 },
      { year: 2034, population: 1200 },
      { year: 2044, population: 1000 },
      { year: 2054, population: 740 },
    ],
    survivalRank: 'B',
    comments: {
      energy:     '「百年の森林」バイオマス・太陽光で約70%自給。森林資源を活かした脱炭素先進村',
      fiscal:     '財政力指数0.12は全国最低水準。ふるさと納税・森林ビジネスで自主財源を確保中',
      population: '2054年に約740人（現在の53%）と推計。移住促進で「消滅可能性村」を回避する戦略',
      wellbeing:  '自然との共生・コミュニティの絆・森林ビジネスの活気が高スコアを維持。移住者に人気',
    },
    aiPromptContext: `
【西粟倉村データ】
- 現在人口: 1,400人（高齢化率 37.5%）
- 財政力指数: 0.12（全国最低水準。ふるさと納税・林業ビジネスで補完）
- エネルギー自給率: 70%（バイオマス・太陽光。百年の森林プロジェクト）
- 2054年推計人口: 740人（現在の53%）
- 生存可能性ランク: B（要注意）
強み: 森林ビジネス「百年の森林」、移住者を惹きつけるブランド力、脱炭素先進地
弱み: 財政力極度に脆弱、農業後継者不足、医療アクセス困難`,
  },

  // ── 上勝町（徳島県勝浦郡）── Sprint #68 ───────────
  kamikatsu: {
    name: '上勝町',
    prefecture: '徳島県',
    energySelfSufficiency: 62,
    fiscalStrength: 11,
    fiscalIndex: 0.11,
    populationViability: 50,
    wellBeingScore: 79,
    currentPopulation: 1500,
    agingRate: 52.0,
    populationForecast: [
      { year: 2024, population: 1500 },
      { year: 2034, population: 1250 },
      { year: 2044, population: 1000 },
      { year: 2054, population: 750 },
    ],
    survivalRank: 'B',
    comments: {
      energy:     'バイオマス・太陽光で約62%自給。2020年ゼロカーボン宣言後、脱炭素で全国トップ級の実績',
      fiscal:     '財政力指数0.11は全国最低水準。ふるさと納税とゼロウェイスト観光で補完している状態',
      population: '2054年に約750人（現在の50%）と推計。高齢化率52%は全国最高水準。行政継続に黄信号',
      wellbeing:  'ゼロウェイスト・自然との共生・「いろどり」事業の高齢者活躍がWell-Beingを高水準に維持',
    },
    aiPromptContext: `
【上勝町データ】
- 現在人口: 1,500人（高齢化率 52.0%、全国最高水準）
- 財政力指数: 0.11（全国最低水準。ゼロウェイスト観光・ふるさと納税で補完）
- エネルギー自給率: 62%（バイオマス・太陽光。2020年ゼロカーボン宣言済み）
- 2054年推計人口: 750人（現在の50%）
- 生存可能性ランク: B（要注意）
強み: ゼロウェイスト宣言で世界的認知度、高齢者活躍（いろどり）、豊かな森林資源
弱み: 高齢化率52%で行政継続に限界、財政力極度脆弱、後継者不在の農業・林業`,
  },

  // ── 神埼市（佐賀県）── Sprint #69 ──────────────────
  kanzaki: {
    name: '神埼市',
    prefecture: '佐賀県',
    energySelfSufficiency: 26,
    fiscalStrength: 24,
    fiscalIndex: 0.24,
    populationViability: 58,
    wellBeingScore: 63,
    currentPopulation: 29000,
    agingRate: 35.0,
    populationForecast: [
      { year: 2024, population: 29000 },
      { year: 2034, population: 25500 },
      { year: 2044, population: 21800 },
      { year: 2054, population: 16800 },
    ],
    survivalRank: 'B',
    comments: {
      energy:     '太陽光・農業バイオマスで約26%自給。農地を活かしたアグリ発電の拡充が脱炭素の鍵',
      fiscal:     '財政力指数0.24は全国平均の半分以下。農業振興・物流拠点化で税基盤強化が急務',
      population: '2054年に約16,800人（現在の58%）と推計。子育て世帯の福岡・佐賀市への流出が加速中',
      wellbeing:  '吉野ヶ里遺跡・農業の豊かさが地域の誇り。保育所不足・共働き支援の充実が定住促進の鍵',
    },
    aiPromptContext: `
【神埼市データ】
- 現在人口: 29,000人（高齢化率 35.0%）
- 財政力指数: 0.24（全国平均の半分以下。農業・物流基盤の強化が急務）
- エネルギー自給率: 26%（太陽光・農業バイオマス）
- 2054年推計人口: 16,800人（現在の58%）
- 生存可能性ランク: B（要注意）
強み: 吉野ヶ里遺跡・農業（麦・大豆）・九州縦貫道IC近接の物流立地
弱み: 子育て世帯の福岡・佐賀市への流出加速、少子化深刻、医療・保育所不足`,
  },

  // ── 気仙沼市（宮城県）── Sprint #70 ──────────────────
  kesennuma: {
    name: '気仙沼市',
    prefecture: '宮城県',
    energySelfSufficiency: 28,
    fiscalStrength: 22,
    fiscalIndex: 0.22,
    populationViability: 47,
    wellBeingScore: 61,
    currentPopulation: 61000,
    agingRate: 38.5,
    populationForecast: [
      { year: 2024, population: 61000 },
      { year: 2034, population: 51000 },
      { year: 2044, population: 41500 },
      { year: 2054, population: 28700 },
    ],
    survivalRank: 'B',
    comments: {
      energy:     '水産加工廃棄物・太陽光で約28%自給。港湾・水産業のグリーン化で脱炭素を加速',
      fiscal:     '財政力指数0.22は全国平均の半分以下。水産業の6次産業化で付加価値・税収を向上',
      population: '2054年に約28,700人（現在の47%）と推計。水産業の担い手不足と若者流出が同時進行',
      wellbeing:  'カツオ・フカヒレ・マグロの水産業への誇りが市民Well-Beingを支える。後継者育成が急務',
    },
    aiPromptContext: `
【気仙沼市データ】
- 現在人口: 61,000人（高齢化率 38.5%）
- 財政力指数: 0.22（全国平均の半分以下。水産業6次産業化で付加価値創出が急務）
- エネルギー自給率: 28%（水産廃棄物・太陽光）
- 2054年推計人口: 28,700人（現在の47%）
- 生存可能性ランク: B（要注意）
強み: カツオ水揚げ量・フカヒレシェア世界トップ、食文化・水産ブランド、三陸の自然
弱み: 水産業後継者不足、若者流出、東日本大震災からの復興過渡期、財政力脆弱`,
  },

  // ── NEC コーポレートIT部門（準備中） ─────────────────
  nec: {
    name: 'NEC コーポレートIT部門',
    prefecture: '東京都',
    energySelfSufficiency: 30,
    fiscalStrength: 85,
    fiscalIndex: 0.85,
    populationViability: 90,
    wellBeingScore: 74,
    currentPopulation: 5000,
    agingRate: 28.0,
    populationForecast: [
      { year: 2024, population: 5000 },
      { year: 2034, population: 4800 },
      { year: 2044, population: 4500 },
      { year: 2054, population: 4300 },
    ],
    survivalRank: 'A',
    comments: {
      energy:     '再生可能エネルギー調達を推進中。2030年カーボンニュートラル目標に向け取り組み強化',
      fiscal:     '安定した財務基盤。IT投資余力は十分あるが、ROI評価の厳格化が求められている',
      population: '従業員数は安定推移。デジタル人材の確保・育成が中長期の最重要課題',
      wellbeing:  'ワークスタイル改革・健康経営を推進。エンゲージメントスコア向上が次のテーマ',
    },
    aiPromptContext: `
【NEC コーポレートIT部門データ】
- 対象従業員: 約5,000人
- IT予算充足度: 高い（財政力指数相当: 0.85）
- エネルギー自給率: 30%（再エネ調達推進中）
- 人材維持率: 90%（デジタル人材確保が課題）
強み: 財務安定、技術力、グローバルネットワーク
弱み: デジタル人材不足、レガシーシステム刷新、組織変革スピード`,
  },
};

/** 選択中の自治体のデータを返す。未定義の場合は yakushima をフォールバック */
function getDataForMunicipality(id: string): MunicipalityDiagnosisData {
  return MUNICIPALITY_DATA[id] ?? MUNICIPALITY_DATA.yakushima;
}

// ─── 指標カードの設定（動的生成） ────────────────────────

type MetricConfig = {
  icon: React.ElementType;
  label: string;
  value: number;
  displayValue: string;
  unit: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'good' | 'warning' | 'danger';
  comment: string;
};

function buildMetrics(d: MunicipalityDiagnosisData): MetricConfig[] {
  return [
    {
      icon: Zap,
      label: 'エネルギー自給率',
      value: d.energySelfSufficiency,
      displayValue: `${d.energySelfSufficiency}%`,
      unit: '',
      color: d.energySelfSufficiency >= 80 ? 'text-yellow-600' : 'text-orange-600',
      bgColor: d.energySelfSufficiency >= 80 ? 'bg-yellow-50' : 'bg-orange-50',
      borderColor: d.energySelfSufficiency >= 80 ? 'border-yellow-200' : 'border-orange-200',
      status: d.energySelfSufficiency >= 80 ? 'good' : d.energySelfSufficiency >= 40 ? 'warning' : 'danger',
      comment: d.comments.energy,
    },
    {
      icon: TrendingDown,
      label: '財政力',
      value: d.fiscalStrength,
      displayValue: d.fiscalIndex.toFixed(2),
      unit: '（財政力指数）',
      color: d.fiscalStrength >= 45 ? 'text-green-600' : 'text-red-600',
      bgColor: d.fiscalStrength >= 45 ? 'bg-green-50' : 'bg-red-50',
      borderColor: d.fiscalStrength >= 45 ? 'border-green-200' : 'border-red-200',
      status: d.fiscalStrength >= 45 ? 'good' : d.fiscalStrength >= 25 ? 'warning' : 'danger',
      comment: d.comments.fiscal,
    },
    {
      icon: Users,
      label: '30年後の人口維持率',
      value: d.populationViability,
      displayValue: `${d.populationViability}%`,
      unit: '',
      color: d.populationViability >= 70 ? 'text-blue-600' : 'text-orange-600',
      bgColor: d.populationViability >= 70 ? 'bg-blue-50' : 'bg-orange-50',
      borderColor: d.populationViability >= 70 ? 'border-blue-200' : 'border-orange-200',
      status: d.populationViability >= 70 ? 'good' : d.populationViability >= 55 ? 'warning' : 'danger',
      comment: d.comments.population,
    },
    {
      icon: Heart,
      label: 'Well-Being スコア',
      value: d.wellBeingScore,
      displayValue: `${d.wellBeingScore}`,
      unit: '/ 100',
      color: d.wellBeingScore >= 70 ? 'text-green-600' : 'text-amber-600',
      bgColor: d.wellBeingScore >= 70 ? 'bg-green-50' : 'bg-amber-50',
      borderColor: d.wellBeingScore >= 70 ? 'border-green-200' : 'border-amber-200',
      status: d.wellBeingScore >= 70 ? 'good' : 'warning',
      comment: d.comments.wellbeing,
    },
  ];
}

// ─── 円形ゲージ ───────────────────────────────────────────

function CircleGauge({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        strokeLinecap="round" className={color}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

// ─── 人口推計グラフ ───────────────────────────────────────

function PopulationChart({ data }: { data: PopulationPoint[] }) {
  const width = 320, height = 160;
  const pL = 60, pR = 20, pT = 20, pB = 40;
  const cW = width - pL - pR, cH = height - pT - pB;
  const maxPop = Math.max(...data.map(d => d.population)) * 1.15;
  const minPop = Math.min(...data.map(d => d.population)) * 0.85;
  const toX = (i: number) => pL + (i / (data.length - 1)) * cW;
  const toY = (v: number) => pT + cH - ((v - minPop) / (maxPop - minPop)) * cH;
  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.population), ...d }));
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const yTicks = [maxPop, (maxPop + minPop) / 2, minPop].map(v => Math.round(v / 1000) * 1000);
  const fmt = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${(v / 1000).toFixed(0)}千`;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="text-orange-500" style={{ minWidth: width }}>
        {yTicks.map(val => {
          const y = toY(val);
          return (
            <g key={val}>
              <line x1={pL} y1={y} x2={width - pR} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
              <text x={pL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{fmt(val)}</text>
            </g>
          );
        })}
        <polyline points={polylinePoints} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(p => (
          <g key={p.year}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="currentColor" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#f97316" fontWeight="600">{fmt(p.population)}</text>
            <text x={p.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#6b7280">{p.year}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── 生存可能性ランクバッジ ───────────────────────────────

function SurvivalRankBadge({ rank }: { rank: string }) {
  const config: Record<string, { color: string; label: string }> = {
    S: { color: 'text-yellow-700 bg-yellow-100 border-yellow-300', label: 'S ランク — 持続可能' },
    A: { color: 'text-green-700 bg-green-100 border-green-300',   label: 'A ランク — 良好' },
    B: { color: 'text-blue-700 bg-blue-100 border-blue-300',      label: 'B ランク — 要注意' },
    C: { color: 'text-orange-700 bg-orange-100 border-orange-300', label: 'C ランク — 危機的' },
    D: { color: 'text-red-700 bg-red-100 border-red-300',         label: 'D ランク — 限界' },
  };
  const c = config[rank] ?? config.B;
  return <span className={`px-3 py-1 rounded-full text-sm font-bold border ${c.color}`}>{c.label}</span>;
}

// ─── メインコンポーネント ─────────────────────────────────

export default function GyoseiDashboard() {
  // Sprint #32: セレクターで選択中の自治体を Context から取得
  // Sprint #74: URLパラメータ（?municipalityId=xxx）からも自動切り替え可能
  const { municipalityId, setMunicipalityId } = useMunicipality();
  const d = getDataForMunicipality(municipalityId);
  const metrics = buildMetrics(d);

  // Sprint #74: useSearchParams でURLパラメータをリアクティブに監視
  // （window.location.search と異なり、Next.js のクライアントサイドナビゲーションでも再発火する）
  const searchParams = useSearchParams();

  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [notionSaveStatus, setNotionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [notionPageUrl, setNotionPageUrl] = useState<string | null>(null);

  // Sprint #74: URLパラメータ ?municipalityId=xxx が変わるたびに自治体コンテキストを自動切り替え
  // searchParams を依存配列に含めることでサイドバーリンクのクリックでも反応する
  useEffect(() => {
    const urlId = searchParams.get('municipalityId');
    if (urlId && urlId !== municipalityId) {
      setMunicipalityId(urlId);
    }
  // municipalityId を依存配列に含めると無限ループになるため除外
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ScenarioContext に自治体データを登録（ChatPanel の行政OSモード用）
  const { setModule, setGyoseiData } = useScenario();
  useEffect(() => {
    setModule('gyosei');
    setGyoseiData({
      townName: d.name,
      population: d.currentPopulation,
      agingRate: d.agingRate,
      fiscalIndex: d.fiscalIndex,
      survivalRank: d.survivalRank,
    });
  // 自治体が切り替わるたびに ChatPanel のコンテキストも更新する
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

  // 自治体切り替え時に AI診断・Notion保存状態をリセット
  useEffect(() => {
    setAiDiagnosis(null);
    setNotionSaveStatus('idle');
    setNotionPageUrl(null);
  }, [municipalityId]);

  /** Notion に行政データを保存する */
  async function saveGyoseiToNotion() {
    setNotionSaveStatus('saving');
    try {
      const response = await fetch('/api/notion/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveType: 'gyosei',
          data: {
            townName: d.name,
            population: d.currentPopulation,
            agingRate: d.agingRate,
            fiscalIndex: d.fiscalIndex,
            survivalRank: d.survivalRank,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotionSaveStatus('saved');
      setNotionPageUrl(result.pageUrl);
    } catch (err) {
      console.error('Notion保存エラー:', err);
      setNotionSaveStatus('error');
    }
  }

  /** Claude AI に地域戦略の診断を依頼する */
  async function handleAiDiagnosis() {
    setAiLoading(true);
    setAiDiagnosis(null);
    const prompt = `以下は${d.name}の地域診断データです。この自治体が持続可能な形で行政サービスを維持するための具体的な戦略を、IT担当者・自治体職員が実行できるレベルで3つ提案してください。
${d.aiPromptContext}
回答は箇条書きで、各提案に「①何をする」「②誰がやる」「③いつまでに」を明記してください。`;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      if (!res.ok) throw new Error('AIの応答取得に失敗しました');
      const data = await res.json();
      setAiDiagnosis(data.response ?? data.content ?? data.text ?? JSON.stringify(data));
    } catch {
      setAiDiagnosis('AI診断を取得できませんでした。右上の「RunWithアシスタント」からご利用ください。');
    } finally {
      setAiLoading(false);
    }
  }

  const lastForecast = d.populationForecast[d.populationForecast.length - 1];

  return (
    <div className="space-y-6">

      {/* ── ページヘッダー ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <MapPin size={14} />
            <span>{d.prefecture}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            🏛️ {d.name} — 地域診断
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            行政OS Phase 1 | {d.name}モデル（実データ）
          </p>
        </div>
        <SurvivalRankBadge rank={d.survivalRank} />
      </div>

      {/* ── 4指標カード ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-xl border p-5 ${m.bgColor} ${m.borderColor}`}>
            <div className="flex items-center gap-2 mb-3">
              <m.icon size={18} className={m.color} />
              <span className="text-sm font-semibold text-gray-700">{m.label}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <CircleGauge value={m.value} color={m.color} size={72} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-base font-black ${m.color}`}>{m.value}</span>
                </div>
              </div>
              <div>
                <div className={`text-2xl font-black ${m.color}`}>
                  {m.displayValue}
                  <span className="text-xs font-normal text-gray-500 ml-1">{m.unit}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {m.status === 'good'
                    ? <CheckCircle size={12} className="text-green-500" />
                    : <AlertCircle size={12} className={m.status === 'danger' ? 'text-red-500' : 'text-orange-500'} />
                  }
                  <span className="text-xs text-gray-500">
                    {m.status === 'good' ? '良好' : m.status === 'warning' ? '要注意' : '危機的'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3 leading-relaxed">{m.comment}</p>
          </div>
        ))}
      </div>

      {/* ── 人口推計グラフ ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingDown size={16} className="text-orange-500" />
          人口推計（2024〜2054年）
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <PopulationChart data={d.populationForecast} />
          <div className="space-y-2 text-sm text-gray-600 min-w-48">
            <div className="flex justify-between">
              <span className="text-gray-500">現在人口</span>
              <span className="font-bold text-gray-800">{d.currentPopulation.toLocaleString()}人</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">高齢化率</span>
              <span className="font-bold text-orange-600">{d.agingRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">30年後推計</span>
              <span className="font-bold text-red-600">{lastForecast.population.toLocaleString()}人</span>
            </div>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                現在の{d.populationViability}%まで変化する見込み。
                行政サービス水準の維持が重要課題。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI 地域診断 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          🤖 Claude AI — {d.name} 地域戦略の提案
        </h2>
        {aiDiagnosis ? (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
            {aiDiagnosis}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 mb-4">
            ボタンを押すと Claude が{d.name}の課題を分析し、具体的な戦略を提案します。
          </div>
        )}
        <button
          onClick={handleAiDiagnosis}
          disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {aiLoading
            ? <><Loader2 size={16} className="animate-spin" />Claude が分析中...</>
            : <>🔍 AI に{d.name}の地域戦略を診断してもらう</>
          }
        </button>

        {/* Notion保存（Sprint #6） */}
        <div className="mt-3 flex items-center gap-2">
          {notionSaveStatus === 'idle' && (
            <button onClick={saveGyoseiToNotion}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-colors">
              📝 行政データをNotionに保存
            </button>
          )}
          {notionSaveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              保存中...
            </div>
          )}
          {notionSaveStatus === 'saved' && notionPageUrl && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 text-sm font-semibold">✅ Notionに保存しました</span>
              <a href={notionPageUrl} target="_blank" rel="noopener noreferrer"
                className="text-emerald-700 text-sm underline hover:text-emerald-600">🔗 開く</a>
            </div>
          )}
          {notionSaveStatus === 'error' && (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-sm">❌ 保存失敗</span>
              <button onClick={saveGyoseiToNotion}
                className="text-red-600 text-sm underline hover:text-red-500">再試行</button>
            </div>
          )}
        </div>
      </div>

      {/* ── RunWith への橋渡しバナー ── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg mb-1 text-emerald-900">🔧 次のステップ：IT基盤を整える</h3>
            <p className="text-emerald-700 text-sm leading-relaxed">
              人口変化が進んでも行政サービスを維持するには、IT運用の効率化が不可欠です。
              RunWith で{d.name}の IT 成熟度を診断し、具体的な改善計画を立てましょう。
            </p>
          </div>
          <Link href="/runwith/maturity"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors whitespace-nowrap shadow-sm">
            RunWith を開く<ChevronRight size={16} />
          </Link>
        </div>
      </div>

    </div>
  );
}
