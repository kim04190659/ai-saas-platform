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

/** Context に格納するデータと操作関数 */
type ScenarioContextType = {
  currentModule: Module;
  gameResult: GameResult | null;
  gyoseiData: GyoseiData | null;
  // 現在のモジュールを設定する（各ページのマウント時に呼ぶ）
  setModule: (module: Module) => void;
  // カードゲーム完了時に結果を保存する
  setGameResult: (result: GameResult) => void;
  // 行政OSのデータを保存する
  setGyoseiData: (data: GyoseiData) => void;
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

    const lines: string[] = [
      'あなたは「RunWith AI」です。ITナレッジエンジンとして、中堅企業・自治体の業務担当者をサポートします。',
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
        setModule,
        setGameResult,
        setGyoseiData,
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
