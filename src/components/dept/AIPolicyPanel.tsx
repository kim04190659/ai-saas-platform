'use client';
/**
 * src/components/dept/AIPolicyPanel.tsx
 * AI 政策文書生成 共通パネル
 *
 * 全部門共有の AI 政策文書生成ページ。
 * DeptConfig の policyTemplates を読み込み、
 * 部門ごとに異なるテンプレートを提供する。
 */

import { useState } from 'react';
import Link from 'next/link';
import type { DeptConfig, PolicyTemplate } from '@/config/departments';

// ─── モック文書生成（実際は /api/document-gen へ POST）─────

function generateMockDocument(template: PolicyTemplate, dept: DeptConfig): string {
  const date = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  return `# ${template.label}
## ${dept.fullName}
作成日: ${date}

---

### エグゼクティブサマリー

本報告書は、${dept.name}部門の直近の状況を分析し、
${template.description}をまとめたものです。

### 現状分析

${dept.staffLabel}のWellBeingスコアは平均65ポイントで、
目標値75に対して10ポイント下回っています。
特に業務負荷の高い${dept.unitLabel}での改善が急務です。

### 主要課題

1. **人員充足率の低下** - 離職・退職により${dept.staffLabel}数が減少しています
2. **業務負荷の集中** - 特定の${dept.unitLabel}・担当に業務が集中しています
3. **連携体制の強化** - 他部門との横断的な連携が不足しています

### 推奨施策

1. ${dept.name}専門人材の採用・育成計画の策定（優先度: 高）
2. 業務プロセスのDX化による負荷軽減（優先度: 中）
3. RunWith Platform による部門横断 WellBeing モニタリングの強化（優先度: 高）

### まとめ

公務員連携の観点から、${dept.name}部門が健全に機能することは
街全体の Well-Being 向上に直結します。
上記施策を速やかに検討・実施することを推奨します。

---
*本文書は RunWith Platform の AI が自動生成しました。内容は担当者によるレビューをお願いします。*`;
}

// ─── サブコンポーネント ────────────────────────────────────

function TemplateCard({
  template, selected, onClick, color,
}: {
  template: PolicyTemplate;
  selected: boolean;
  onClick: () => void;
  color: { bg: string; border: string; text: string; badge: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? `${color.bg} ${color.border.replace('border-', 'border-2 border-')}`
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{template.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${selected ? color.text : 'text-slate-700'}`}>
              {template.label}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${selected ? color.badge : 'bg-slate-100 text-slate-500'}`}>
              {template.time}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
        </div>
      </div>
    </button>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export function AIPolicyPanel({ dept }: { dept: DeptConfig }) {
  const { color } = dept;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [document,   setDocument]   = useState<string | null>(null);
  const [copied,     setCopied]      = useState(false);

  const selectedTemplate = dept.policyTemplates.find((t) => t.id === selectedId);

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setDocument(null);
    // 実際は /api/document-gen に POST する（ここではモック生成）
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setDocument(generateMockDocument(selectedTemplate, dept));
    setGenerating(false);
  };

  const handleCopy = () => {
    if (!document) return;
    navigator.clipboard.writeText(document).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ヘッダー */}
        <div className={`rounded-2xl border ${color.bg} ${color.border} p-5`}>
          <h1 className={`text-xl font-bold ${color.text}`}>
            {dept.emoji} {dept.name}｜AI政策文書生成
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            蓄積データをAIが分析し、{dept.name}向けの政策文書を自動ドラフトします
          </p>
          <span className={`mt-2 inline-block text-xs px-2.5 py-1 rounded-full border ${color.badge} ${color.border}`}>
            🤖 Claude AI が {dept.fullName} のデータをもとに生成
          </span>
        </div>

        {/* テンプレート選択 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            📋 テンプレートを選択してください
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dept.policyTemplates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                selected={selectedId === t.id}
                onClick={() => setSelectedId(t.id)}
                color={color}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedTemplate || generating}
            className={`mt-4 w-full py-3 rounded-xl font-medium text-sm transition-colors ${
              !selectedTemplate || generating
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : color.primary
            }`}
          >
            {generating
              ? '🤖 AIが文書を生成中…（約2〜3秒）'
              : selectedTemplate
              ? `🤖 「${selectedTemplate.label}」を生成する`
              : 'テンプレートを選択してください'}
          </button>
        </div>

        {/* 生成結果 */}
        {document && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-700">
                📄 生成された文書
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    copied
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {copied ? '✅ コピー済み' : '📋 コピー'}
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-xl border border-slate-200 p-4 leading-relaxed max-h-[500px] overflow-y-auto font-sans">
              {document}
            </pre>
            <p className="text-xs text-slate-400 mt-3">
              ※ このドラフトをベースに、担当者が内容をレビュー・編集してご利用ください
            </p>
          </div>
        )}

        {/* 導線 */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-2">💡 より精度の高い文書生成のために</p>
          <p className="text-xs text-indigo-600 mb-2">
            {dept.staffLabel}コンディションやサービス状況のデータを蓄積すると、AIがより具体的な分析を行います。
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/${dept.id}/staff`} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${color.badge} border ${color.border}`}>
              👥 {dept.staffLabel}コンディションを記録する
            </Link>
            <Link href={`/${dept.id}/service`} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${color.badge} border ${color.border}`}>
              📊 サービス状況を記録する
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
