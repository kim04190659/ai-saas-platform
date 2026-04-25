'use client';

// =====================================================
//  src/contexts/MunicipalityContext.tsx
//  選択中自治体のグローバル状態管理 — Sprint #32
//
//  ■ このファイルの役割
//    ユーザーがヘッダーのドロップダウンで選んだ「自治体」を
//    React Context でアプリ全体に共有する。
//
//  ■ 使い方
//    【提供側】 layout.tsx で <MunicipalityProvider> でラップする
//    【参照側】 各コンポーネントで useMunicipality() フックを使う
//
//  ■ データフロー
//    セレクターで選択
//      ↓
//    MunicipalityContext の municipalityId を更新
//      ↓
//    API コール時に ?municipalityId=kirishima を付与
//      ↓
//    API ルートが Notion DB を自治体名でフィルタリングして返す
// =====================================================

import React, { createContext, useContext, useState } from 'react';
import {
  Municipality,
  MUNICIPALITIES,
  DEFAULT_MUNICIPALITY,
  getMunicipalityById,
} from '@/config/municipalities';

// ─── Context 型定義 ───────────────────────────────────

interface MunicipalityContextType {
  /** 現在選択中の自治体ID（例: 'kirishima'） */
  municipalityId: string;
  /** 現在選択中の自治体オブジェクト（全プロパティ含む） */
  municipality: Municipality;
  /** 選択可能な全自治体の一覧 */
  municipalities: Municipality[];
  /** 自治体を切り替えるための関数 */
  setMunicipalityId: (id: string) => void;
}

// ─── Context 生成 ─────────────────────────────────────

const MunicipalityContext = createContext<MunicipalityContextType | undefined>(undefined);

// ─── Provider コンポーネント ──────────────────────────

/**
 * MunicipalityProvider
 *
 * アプリ全体（またはダッシュボードレイアウト）をラップして、
 * 選択中自治体をどの子コンポーネントからでも参照できるようにする。
 */
export function MunicipalityProvider({ children }: { children: React.ReactNode }) {
  // デフォルトは霧島市（MUNICIPALITIES の先頭）
  const [municipalityId, setMunicipalityId] = useState<string>(DEFAULT_MUNICIPALITY.id);

  // ID から自治体オブジェクトを解決する
  const municipality = getMunicipalityById(municipalityId);

  return (
    <MunicipalityContext.Provider
      value={{
        municipalityId,
        municipality,
        municipalities: MUNICIPALITIES,
        setMunicipalityId,
      }}
    >
      {children}
    </MunicipalityContext.Provider>
  );
}

// ─── カスタムフック ────────────────────────────────────

/**
 * useMunicipality
 *
 * 選択中の自治体情報を取得するカスタムフック。
 * MunicipalityProvider の外で呼ぶとエラーになる。
 *
 * @example
 * const { municipalityId, municipality } = useMunicipality();
 * const res = await fetch(`/api/foo?municipalityId=${municipalityId}`);
 */
export function useMunicipality(): MunicipalityContextType {
  const context = useContext(MunicipalityContext);
  if (context === undefined) {
    throw new Error('useMunicipality は MunicipalityProvider の内側で使用してください');
  }
  return context;
}
