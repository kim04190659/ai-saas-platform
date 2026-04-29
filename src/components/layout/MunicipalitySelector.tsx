'use client';

// =====================================================
//  src/components/layout/MunicipalitySelector.tsx
//  自治体切り替えドロップダウン — Sprint #32
//
//  ■ このコンポーネントの役割
//    ヘッダーに表示する自治体切り替えドロップダウンUI。
//    選択すると MunicipalityContext の municipalityId が更新され、
//    アプリ全体のデータが切り替わる（マルチテナント切り替え）。
//
//  ■ 表示ルール
//    - status: 'active' → 通常表示（選択可能）
//    - status: 'coming' → グレーアウト表示（選択不可）
//    - status: 'demo'   → "デモ" バッジ付きで選択可能
// =====================================================

import { useState } from 'react';
import { ChevronDown, MapPin, Building2 } from 'lucide-react';
import { useMunicipality } from '@/contexts/MunicipalityContext';
import { Municipality } from '@/config/municipalities';

// ─── カラーマップ ─────────────────────────────────────
// Tailwind はクラス名を静的解析するため、動的な文字列結合は避けてマップを使う

const colorDotMap: Record<string, string> = {
  teal:    'bg-teal-500',
  emerald: 'bg-emerald-500',
  blue:    'bg-blue-500',
  violet:  'bg-violet-500',
  amber:   'bg-amber-500',
  cyan:    'bg-cyan-500',
  rose:    'bg-rose-500',
  orange:  'bg-orange-500',
  green:   'bg-green-500',   // Sprint #68 上勝町
  pink:    'bg-pink-500',    // Sprint #69 神埼市
};

const colorTextMap: Record<string, string> = {
  teal:    'text-teal-700',
  emerald: 'text-emerald-700',
  blue:    'text-blue-700',
  violet:  'text-violet-700',
  amber:   'text-amber-700',
  cyan:    'text-cyan-700',
  rose:    'text-rose-700',
  orange:  'text-orange-700',
  green:   'text-green-700',   // Sprint #68 上勝町
  pink:    'text-pink-700',    // Sprint #69 神埼市
};

const colorBgMap: Record<string, string> = {
  teal:    'bg-teal-50 border-teal-200',
  emerald: 'bg-emerald-50 border-emerald-200',
  blue:    'bg-blue-50 border-blue-200',
  violet:  'bg-violet-50 border-violet-200',
  amber:   'bg-amber-50 border-amber-200',
  cyan:    'bg-cyan-50 border-cyan-200',
  rose:    'bg-rose-50 border-rose-200',
  orange:  'bg-orange-50 border-orange-200',
  green:   'bg-green-50 border-green-200',   // Sprint #68 上勝町
  pink:    'bg-pink-50 border-pink-200',     // Sprint #69 神埼市
};

// 実装済み機能バッジの背景色マップ
const colorFeatureBadgeMap: Record<string, string> = {
  teal:    'bg-teal-100 text-teal-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  blue:    'bg-blue-100 text-blue-700',
  violet:  'bg-violet-100 text-violet-700',
  amber:   'bg-amber-100 text-amber-700',
  cyan:    'bg-cyan-100 text-cyan-700',
  rose:    'bg-rose-100 text-rose-700',
  orange:  'bg-orange-100 text-orange-700',
  green:   'bg-green-100 text-green-700',   // Sprint #68 上勝町
  pink:    'bg-pink-100 text-pink-700',     // Sprint #69 神埼市
};

// ─── サブコンポーネント：選択肢の1行 ─────────────────

function MunicipalityOption({
  m,
  isSelected,
  onSelect,
}: {
  m: Municipality;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isDisabled   = m.status === 'coming';
  const dotColor     = colorDotMap[m.color]          ?? 'bg-gray-400';
  const featureBadge = colorFeatureBadgeMap[m.color] ?? 'bg-gray-100 text-gray-600';

  // アイコンの選択（自治体か企業か）
  const Icon = m.id === 'nec' ? Building2 : MapPin;

  return (
    <button
      onClick={isDisabled ? undefined : onSelect}
      disabled={isDisabled}
      className={[
        'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
        isDisabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-gray-50 cursor-pointer',
        isSelected ? 'bg-gray-50' : '',
      ].join(' ')}
    >
      {/* ステータスドット */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />

      {/* アイコン */}
      <Icon size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />

      {/* 自治体名 + 実装済み機能フラグ */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>

        {/* ステータス表示 */}
        {m.status === 'coming' && (
          <p className="text-xs text-gray-400">準備中</p>
        )}
        {m.status === 'demo' && (
          <p className="text-xs text-amber-500">デモ</p>
        )}

        {/* 実装済み機能バッジ */}
        {m.implementedFeatures && m.implementedFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {m.implementedFeatures.map((f) => (
              <span
                key={f.label}
                className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${featureBadge}`}
              >
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 選択中チェック */}
      {isSelected && (
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">✓</span>
      )}
    </button>
  );
}

// ─── メインコンポーネント ─────────────────────────────

export default function MunicipalitySelector() {
  const { municipalityId, municipality, municipalities, setMunicipalityId } = useMunicipality();
  const [isOpen, setIsOpen] = useState(false);

  // 現在の自治体のカラークラスを解決
  const dotColor  = colorDotMap[municipality.color]  ?? 'bg-gray-400';
  const textColor = colorTextMap[municipality.color] ?? 'text-gray-700';
  const bgColor   = colorBgMap[municipality.color]   ?? 'bg-gray-50 border-gray-200';

  const handleSelect = (id: string) => {
    setMunicipalityId(id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* ─ トリガーボタン ─ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={[
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
          bgColor,
          textColor,
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* ステータスドット */}
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />

        {/* 選択中の自治体名（短縮名） */}
        <span>{municipality.shortName}</span>

        {/* 開閉矢印 */}
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ─ ドロップダウンパネル ─ */}
      {isOpen && (
        <>
          {/* オーバーレイ（クリックで閉じる） */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* ドロップダウン本体 */}
          <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {/* ヘッダー */}
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                自治体を切り替え
              </p>
            </div>

            {/* 選択肢リスト */}
            <div role="listbox" aria-label="自治体選択">
              {municipalities.map((m) => (
                <MunicipalityOption
                  key={m.id}
                  m={m}
                  isSelected={m.id === municipalityId}
                  onSelect={() => handleSelect(m.id)}
                />
              ))}
            </div>

            {/* フッター */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                自治体ごとにデータが分離されています
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
