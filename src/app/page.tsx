"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import ChatPanel from "@/components/layout/ChatPanel";
import { MessageSquare, Gamepad2, Building2, Activity, ChevronRight, ArrowRight } from "lucide-react";

// ─── モジュール定義 ──────────────────────────────────────
// 各モジュールのアクセントカラーをライトビジネストーンで定義
const modules = [
  {
    icon: Gamepad2,
    title: "LOGI-TECH",
    emoji: "🃏",
    subtitle: "カードゲーム教育ツール",
    description:
      "ITIL/SIAMの知見を体験学習。高専・企業研修・自治体職員研修でITサービス管理を楽しく習得。",
    // sky = LOGI-TECH専用アクセントカラー
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-200",
    accentIcon: "bg-sky-100 text-sky-600",
    accentText: "text-sky-700",
    accentBadge: "bg-sky-100 text-sky-700",
    accentButton: "bg-sky-600 hover:bg-sky-700 text-white",
    links: [
      { label: "カードゲームを始める", href: "/card-game" },
      { label: "Well-Being QUEST", href: "/well-being-quest" },
    ],
    status: "稼働中",
  },
  {
    icon: Building2,
    title: "行政OS",
    emoji: "🏛️",
    subtitle: "自治体運営支援",
    description:
      "限界自治体が職員12名で大都市と同等のサービスを提供できる仕組み。屋久島PoC進行中。",
    // emerald = 行政OS専用アクセントカラー
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200",
    accentIcon: "bg-emerald-100 text-emerald-600",
    accentText: "text-emerald-700",
    accentBadge: "bg-emerald-100 text-emerald-700",
    accentButton: "bg-emerald-600 hover:bg-emerald-700 text-white",
    links: [
      { label: "ダッシュボードを開く", href: "/gyosei/dashboard" },
    ],
    status: "開発中",
  },
  {
    icon: Activity,
    title: "RunWith",
    emoji: "🔧",
    subtitle: "システム運用・成熟度診断",
    description:
      "35年のIT運用知見をソフトウェアに実装。ITIL/SIAMベースの運用管理ツールで組織のIT成熟度を可視化。",
    // orange = RunWith専用アクセントカラー
    accentBg: "bg-orange-50",
    accentBorder: "border-orange-200",
    accentIcon: "bg-orange-100 text-orange-600",
    accentText: "text-orange-700",
    accentBadge: "bg-orange-100 text-orange-700",
    accentButton: "bg-orange-600 hover:bg-orange-700 text-white",
    links: [
      { label: "IT運用成熟度診断", href: "/runwith/maturity" },
    ],
    status: "稼働中",
  },
];

// ─── メインコンポーネント ────────────────────────────────
export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── ヘッダー ── */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">RunWith プラットフォーム</h2>
            <p className="text-xs text-slate-400 mt-0.5">生産人口が減っても、生産量は増やせる。</p>
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <MessageSquare size={15} />
            AIアシスタント
          </button>
        </header>

        {/* ── メインコンテンツ ── */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <div className="max-w-3xl mx-auto">

            {/* ページタイトル */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800">
                木村好孝のコンピタンスをソフトウェアで実装する
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                35年のIT運用経験 × ITIL/SIAM × カードゲーム教育 を3つのモジュールに集約
              </p>
            </div>

            {/* ── モジュールカード一覧 ── */}
            <div className="space-y-4">
              {modules.map((mod) => (
                <div
                  key={mod.title}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${mod.accentBorder}`}
                >
                  {/* カードヘッダー（ライトアクセント） */}
                  <div className={`${mod.accentBg} px-6 py-5 border-b ${mod.accentBorder}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* アイコン */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.accentIcon}`}>
                          <mod.icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-base font-bold ${mod.accentText}`}>
                              {mod.emoji} {mod.title}
                            </h3>
                            {/* ステータスバッジ */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mod.accentBadge}`}>
                              {mod.status}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs mt-0.5">{mod.subtitle}</p>
                        </div>
                      </div>
                    </div>
                    {/* 説明文 */}
                    <p className="text-slate-600 text-sm leading-relaxed mt-3">
                      {mod.description}
                    </p>
                  </div>

                  {/* カードフッター（アクションボタン） */}
                  <div className="px-6 py-4 bg-white">
                    {mod.links.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {mod.links.map((link) => (
                          <Link key={link.href} href={link.href}>
                            <button className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${mod.accentButton}`}>
                              {link.label}
                              <ChevronRight size={14} />
                            </button>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">メニューから開発状況を確認できます</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── テーゼ（フッター） ── */}
            <div className="mt-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">📍 テーゼ</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                生産人口が減っても、生産量は増やせる。
                それは人の数の問題ではなく、<strong className="text-slate-900">設計の問題</strong>だ。
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                <ArrowRight size={12} />
                <span>AIアシスタントに質問する → 右上「AIアシスタント」ボタン</span>
              </div>
            </div>

          </div>
        </main>
      </div>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
