"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import ChatPanel from "@/components/layout/ChatPanel";
import { MessageSquare, Gamepad2, Building2, Activity, ChevronRight } from "lucide-react";

const modules = [
  {
    icon: Gamepad2,
    title: '🃏 カードゲーム',
    subtitle: '教育ツール',
    description: 'ITIL/SIAMの知見を体験学習。高専・企業研修・自治体職員研修で活用。',
    color: 'from-blue-600 to-blue-800',
    accent: 'bg-blue-500',
    links: [
      { label: 'カードゲームを始める', href: '/card-game' },
      { label: 'Well-Being QUEST', href: '/well-being-quest' },
    ],
    status: '稼働中',
  },
  {
    icon: Building2,
    title: '🏛️ 行政OS',
    subtitle: '自治体運営支援',
    description: '限界自治体が職員12名で大都市と同等のサービスを提供できる仕組み。屋久島PoC進行中。',
    color: 'from-green-600 to-green-800',
    accent: 'bg-green-500',
    links: [],
    status: '開発中',
  },
  {
    icon: Activity,
    title: '🔧 RunWith',
    subtitle: 'システム運用・監視',
    description: '35年のIT運用知見をソフトウェアに実装。ITIL/SIAMベースの運用管理ツール。',
    color: 'from-orange-600 to-orange-800',
    accent: 'bg-orange-500',
    links: [],
    status: '計画中',
  },
];

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold">AI SaaS Platform</h2>
            <p className="text-xs text-gray-400">生産人口が減っても、生産量は増やせる。</p>
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <MessageSquare size={16} />
            AIチャット
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              木村好孝のコンピタンスをソフトウェアで実装する
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              35年のIT運用経験 × ITIL/SIAM × カードゲーム教育 を3つのモジュールに集約
            </p>

            <div className="grid grid-cols-1 gap-6">
              {modules.map((mod) => (
                <div key={mod.title} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`bg-gradient-to-r ${mod.color} p-5 text-white`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <mod.icon size={28} />
                        <div>
                          <h3 className="text-lg font-bold">{mod.title}</h3>
                          <p className="text-xs opacity-75">{mod.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded-full">
                        {mod.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm opacity-90 leading-relaxed">{mod.description}</p>
                  </div>

                  <div className="p-4">
                    {mod.links.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {mod.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-1 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            {link.label}
                            <ChevronRight size={14} />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">メニューから開発状況を確認できます</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">📍 テーゼ</p>
              <p className="text-sm text-blue-800 mt-1">
                生産人口が減っても、生産量は増やせる。
                それは人の数の問題ではなく、<strong>設計の問題</strong>だ。
              </p>
            </div>
          </div>
        </main>
      </div>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
