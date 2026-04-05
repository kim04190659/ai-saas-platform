/**
 * ScenarioContext - Sprint #4: シナリオ文脈連携
 *
 * カードゲーム → 行政OS → RunWith の3モジュール間で
 * AI文脈（どのページにいるか・ゲーム結果など）を共有するための React Context。
 *
 * ChatPanel がこの情報を元にシステムプロンプトを組み立て、
 * AIがモジュールに合わせた専門家として応答できるようになる。
 */

'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// ─── 型定義 ──────────────────────────────────────────────

/** 現在表示中のモジュール */
export type Module = 'home' | 'card-game' | 'gyosei' | 'runwith';

/** カードゲーム（Mission in LOGI-TECH）の結果サマリー */
export type GameResult = {
  grade: string;              // S / A / B / C / D
  totalProfit3Years: number;  // 3年間累計利益（万円）
  successRate: number;        // 事業成功率（%）
  missionTitle: string;       // 選んだ課題カードのタイトル
  personaTitles: string[];    // 選んだペルソナのタイトル群
  completedAt: string;        // ゲーム完了時刻（ISO文字列）
};

/** 行政OS の自治体データ */
export type GyoseiData = {
  townName: string;       // 自治体名（例: 屋久島町）
  population: number;     // 人口（人）
  agingRate: number;      // 高齢化率（%）
  fiscalIndex: number;    // 財政力指数
  survivalRank: string;   // 生存可能性ランク（S/A/B/C/D）
};

/** RunWith IT運用成熟度診断の結果 */
export type RunwithData = {
  maturityLevel: number;        // 成熟度レベル（1〜5）
  maturityLabel: string;        // レベル名（初期/反復/定義/管理/最適化）
  totalScore: number;           // 合計スコア
  maxScore: number;             // 最大スコア
  areaScores: Record<string, number>; // 領域別スコア（インシデント管理など）
  weakAreas: string[];          // 特に改善が必要な領域
  completedAt: string;          // 診断完了時刻（ISO文字列）
};

/** Context に格納するデータと操作関数 */
type ScenarioContextType = {
  currentModule: Module;
  gameResult: GameResult | null;
  gyoseiData: GyoseiData | null;
  runwithData: RunwithData | null;
  // 現在のモジュールを設定する（各ページのマウント時に呼ぶ）
  setModule: (module: Module) => void;
  // カードゲーム完了時に結果を保存する
  setGameResult: (result: GameResult) => void;
  // 行政OSのデータを保存する
  setGyoseiData: (data: GyoseiData) => void;
  // RunWith 成熟度診断の結果を保存する
  setRunwithData: (data: RunwithData) => void;
  // ChatPanel 用のシステムプロンプト文字列を生成する
  buildSystemPrompt: () => string;
};

// ─── Context の作成 ──────────────────────────────────────

const ScenarioContext = createContext<ScenarioContextType | null>(null);

// ─── Provider コンポーネント ────────────────────────────

/**
 * ScenarioContextProvider
 * ルートレイアウト（layout.tsx）でアプリ全体を囲む。
 * これにより全ページで useScenario() が使えるようになる。
 */
export function ScenarioContextProvider({ children }: { children: ReactNode }) {
  const [currentModule, setCurrentModule] = useState<Module>('home');
  const [gameResult, setGameResultState] = useState<GameResult | null>(null);
  const [gyoseiData, setGyoseiDataState] = useState<GyoseiData | null>(null);
  const [runwithData, setRunwithDataState] = useState<RunwithData | null>(null);

  // ── セッター ──

  function setModule(module: Module) {
    setCurrentModule(module);
  }

  function setGameResult(result: GameResult) {
    setGameResultState(result);
  }

  function setGyoseiData(data: GyoseiData) {
    setGyoseiDataState(data);
  }

  function setRunwithData(data: RunwithData) {
    setRunwithDataState(data);
  }

  // ── システムプロンプト生成 ──────────────────────────────
  // ChatPanel がこれを呼び出してAIへのシステムプロンプトに使う

  function buildSystemPrompt(): string {
    // モジュール名の日本語ラベル
    const moduleLabels: Record<Module, string> = {
      home: 'ホーム（概要ページ）',
      'card-game': 'カードゲーム — Mission in LOGI-TECH（物流Make or Buy）',
      gyosei: '行政OS（屋久島町モデル）',
      runwith: 'RunWith（IT運用管理支援）',
    };

    // ホームモードはRunWith Platform専門アシスタントとして動作
    if (currentModule === 'home') {
      return [
        'あなたは「RunWithアシスタント」です。RunWith Platform（中堅企業・自治体向けITナレッジエンジン）の操作方法・仕様・設計思想を専門に教えるAIアシスタントです。',
        '',
        '【RunWith Platform の概要】',
        '- 目的: 住民と職員が共創し、Well-Beingな街をつくる基盤プラットフォーム',
        '- 3つの柱: Well-Being（幸福度）× SDL（価値共創）× 自治体DX',
        '- バックエンド: Notion（データ蓄積）+ Claude AI（分析・提言）',
        '- 対象: 中堅企業・自治体の業務担当者（非エンジニア含む）',
        '',
        '【主要機能と操作方法（URLとセットで案内する）】',
        '1. Well-Beingダッシュボード（/gyosei/dashboard）',
        '   - 月次WBスコアの推移グラフ・職員/住民の幸福度指標を可視化',
        '   - 操作: ダッシュボードにアクセスするだけで自動表示（Notionからデータ取得）',
        '2. 職員コンディション管理（/gyosei/staff）',
        '   - 職員が体調・業務負荷・チームWBを5段階で記録',
        '   - 操作: 「新規記録」ボタン → 各スコアを選択 → 送信でNotionに自動保存',
        '3. AI Well-Being顧問（/ai-advisor）',
        '   - 自治体のNotionデータをもとにAIが政策提言・現状分析を日本語で提供',
        '   - 操作: 質問を入力するだけ。自治体名・KPIは自動参照',
        '4. 人口・地域データ（/gyosei/population）',
        '   - 人口推移・高齢化率・出生率のグラフ表示',
        '5. LINE相談ログ（/gyosei/services）',
        '   - 住民からのLINE相談を職員が対応記録・ステータス管理',
        '6. IT運用成熟度診断（/runwith/maturity）',
        '   - 5段階診断（初期→反復→定義→管理→最適化）で現状把握',
        '7. 横展開設定（/runwith/multi-tenant）',
        '   - 複数自治体への展開管理・オンボーディング7ステップの進捗確認',
        '8. カードゲーム（/card-game/select）',
        '   - SDL学習・Make or Buy 意思決定演習（ゲーム形式で楽しく学べる）',
        '',
        '【Well-Beingスコアの計算式（仕様）】',
        '- 計算式: 体調スコア(1-5)×10 + (5-業務負荷スコア)×10 + (チームWBスコア-1)×5',
        '- 最高100点（体調5・業務負荷1・チームWB5の場合）',
        '- 目標ゾーン: 70点以上 / 要注意ゾーン: 50点未満',
        '- 業務負荷は「低いほど良い」ため、スコアが逆転する設計になっている',
        '',
        '【SDL（価値共創）の設計思想】',
        '- Service Dominant Logic（サービス支配論理）の略',
        '- 「サービスは提供者と受益者が共に価値を創る」という発想',
        '- 住民が行政サービスの価値創造に参加することを重視',
        '- タッチポイントスコア（1-5点）で職員と住民の価値共創度を計測',
        '- 未来町（先行優良）と屋久島町（追いかける）でスコアに差がある',
        '',
        '【デモシナリオのポイント】',
        '- 未来町（DX先進・スコア高め）と屋久島町（追いかける・課題あり）を対比して見せる',
        '- ダッシュボードでWBスコア差を見せ → AI顧問に「改善策は？」と質問するとインパクト大',
        '- 職員コンディション（100名体制）のデータが既に入っているのでリアリティある',
        '',
        '【回答の方針】',
        '- 専門用語は避け、業務担当者が理解できる言葉で説明する',
        '- 操作方法の質問には具体的なURL（/gyosei/staff など）を含めて案内する',
        '- 設計思想の質問には WB・SDL・DX の3軸で説明する',
        '- 回答は日本語で、300字以内を目安に簡潔に答える',
      ].join('\n');
    }

    const lines: string[] = [
      'あなたは「RunWithアシスタント」です。ITナレッジエンジンとして、中堅企業・自治体の業務担当者をサポートします。',
      '',
      '【現在の状況】',
      `- 表示中モジュール: ${moduleLabels[currentModule]}`,
    ];

    // 行政OS データが読み込まれている場合
    if (gyoseiData) {
      lines.push(
        `- ${gyoseiData.townName}データ: 人口${gyoseiData.population.toLocaleString()}人` +
        ` / 高齢化率${gyoseiData.agingRate}%` +
        ` / 財政力指数${gyoseiData.fiscalIndex}` +
        ` / 生存可能性ランク${gyoseiData.survivalRank}`
      );
    }

    // カードゲームの結果がある場合
    if (gameResult) {
      lines.push('');
      lines.push('【カードゲーム結果（直近セッション）】');
      lines.push(
        `- 総合ランク: ${gameResult.grade}` +
        `（3年累計利益: ${gameResult.totalProfit3Years.toLocaleString()}万円` +
        ` / 事業成功率: ${gameResult.successRate}%）`
      );
      lines.push(`- 取り組んだ課題: 「${gameResult.missionTitle}」`);
      if (gameResult.personaTitles.length > 0) {
        lines.push(`- 対象ペルソナ: ${gameResult.personaTitles.join('、')}`);
      }
    }

    // 応答方針
    lines.push('');
    lines.push('【応答の方針】');

    if (currentModule === 'card-game') {
      lines.push('- Make or Buy の意思決定、事業計画の考え方について専門的に回答する');
      lines.push('- カードゲームのルールや戦略についての質問に答える');
    } else if (currentModule === 'gyosei') {
      lines.push('- 自治体の財政・人口・Well-Being指標について専門的に回答する');
      if (gameResult) {
        lines.push('- カードゲームで学んだ直営（Make）vs 委託（Buy）の概念を行政サービスに結びつけて説明する');
      }
    } else if (currentModule === 'runwith') {
      lines.push('- IT運用管理、インシデント対応、成熟度向上について専門的に回答する');
      // RunWith 成熟度診断の結果がある場合はその情報も加える
      if (runwithData) {
        lines.push('');
        lines.push('【IT運用成熟度診断の結果（直近セッション）】');
        lines.push(
          `- 成熟度レベル: Lv.${runwithData.maturityLevel} ${runwithData.maturityLabel}` +
          `（スコア: ${runwithData.totalScore} / ${runwithData.maxScore}点）`
        );
        if (runwithData.weakAreas.length > 0) {
          lines.push(`- 改善が必要な領域: ${runwithData.weakAreas.join('、')}`);
        }
        lines.push('- ユーザーの成熟度レベルに合わせた具体的な改善提案を行う');
      }
    } else {
      lines.push('- ユーザーの質問に対してITと業務の視点から回答する');
    }

    lines.push('- 専門用語は避け、業務担当者が理解できる言葉で簡潔に回答する（目安300字以内）');
    lines.push('- 回答は日本語で行う');

    return lines.join('\n');
  }

  return (
    <ScenarioContext.Provider
      value={{
        currentModule,
        gameResult,
        gyoseiData,
        runwithData,
        setModule,
        setGameResult,
        setGyoseiData,
        setRunwithData,
        buildSystemPrompt,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

// ─── カスタムフック ──────────────────────────────────────

/**
 * useScenario - ScenarioContext を取得するカスタムフック
 * ScenarioContextProvider の内側のコンポーネントで使う。
 */
export function useScenario(): ScenarioContextType {
  const ctx = useContext(ScenarioContext);
  if (!ctx) {
    throw new Error('useScenario must be used within ScenarioContextProvider');
  }
  return ctx;
}
