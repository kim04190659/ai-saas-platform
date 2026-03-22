/**
 * ════════════════════════════════════════════════════════
 *  新機能ページ テンプレート
 * ════════════════════════════════════════════════════════
 *
 * ■ 使い方
 *   1. このファイルを新しいディレクトリにコピーする
 *      例: src/app/(dashboard)/runwith/incidents/page.tsx
 *
 *   2. 以下の「★カスタマイズ」コメント箇所を編集する
 *      - MODULE_ID: features.ts のモジュールIDを指定
 *      - ページタイトル・説明・メインコンテンツ
 *
 *   3. features.ts の該当モジュールの pages[] で
 *      status を 'coming' → 'active' に変更する
 *
 *   4. git push → Vercel 自動デプロイ
 *
 * ■ 標準構成
 *   - ヘッダー（モジュールアクセントカラー）
 *   - コンテンツエリア（白カード）
 *   - Notion保存ボタン（任意）
 *   - 前のページへの戻るリンク
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getModule } from "@/config/features";

// ★カスタマイズ: 対象モジュールのIDを指定（'card-game' | 'gyosei' | 'runwith'）
const MODULE_ID = "runwith";

// ★カスタマイズ: ページ情報
const PAGE_TITLE = "新機能ページ";
const PAGE_DESCRIPTION = "このページの説明文を入力してください。";
const BACK_HREF = "/runwith/maturity"; // 戻り先URL

export default function TemplatePage() {
  // Notion保存ステータス（不要なら削除してもよい）
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // モジュール定義を取得（アクセントカラーなどを自動適用）
  const mod = getModule(MODULE_ID);
  if (!mod) return null;

  // ── Notion保存処理（不要なら削除してもよい）──
  const saveToNotion = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/notion/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveType: MODULE_ID,
          data: {
            // ★カスタマイズ: 保存したいデータを入れる
            title: PAGE_TITLE,
            completedAt: new Date().toISOString(),
          },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── ヘッダー（モジュールアクセントカラー自動適用）── */}
      <div className={`${mod.accent.bg} border-b ${mod.accent.border} px-6 py-5`}>
        {/* パンくずリスト */}
        <Link
          href={BACK_HREF}
          className={`flex items-center gap-1 text-xs ${mod.accent.text} hover:underline mb-3`}
        >
          <ChevronLeft size={13} />
          戻る
        </Link>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.accent.icon}`}>
            <mod.icon size={20} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${mod.accent.text}`}>
              {mod.emoji} {PAGE_TITLE}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">{PAGE_DESCRIPTION}</p>
          </div>
        </div>
      </div>

      {/* ── メインコンテンツ ── */}
      <div className="p-6 max-w-3xl mx-auto space-y-4">

        {/* ★カスタマイズ: ここにページのメインコンテンツを書く */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-800 mb-3">
            セクションタイトル
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            ここにコンテンツを追加してください。
          </p>
        </div>

        {/* ── Notion保存（不要なら削除してもよい）── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-slate-500 text-xs font-semibold mb-2">📝 結果をNotionに保存</p>

          {saveStatus === "idle" && (
            <button
              onClick={saveToNotion}
              className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm transition-all"
            >
              Notionに保存する
            </button>
          )}
          {saveStatus === "saving" && (
            <div className="flex items-center justify-center gap-2 py-2.5 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              保存中...
            </div>
          )}
          {saveStatus === "saved" && (
            <p className="text-emerald-700 text-sm font-semibold text-center py-1">✅ Notionに保存しました</p>
          )}
          {saveStatus === "error" && (
            <div className="space-y-2">
              <p className="text-red-600 text-sm text-center">❌ 保存に失敗しました</p>
              <button onClick={saveToNotion}
                className="w-full py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50">
                再試行する
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
