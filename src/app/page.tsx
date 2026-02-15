"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ChatPanel from "@/components/layout/ChatPanel";
import { MessageSquare } from "lucide-react";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">ダッシュボード</h2>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <MessageSquare size={20} />
            AIチャット
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <h1 className="text-3xl font-bold mb-6">
            AI SaaSプラットフォームへようこそ
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">機能 1</h3>
              <p className="text-gray-600">
                最初のサービス機能がここに表示されます
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">機能 2</h3>
              <p className="text-gray-600">
                2番目のサービス機能がここに表示されます
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">機能 3</h3>
              <p className="text-gray-600">
                3番目のサービス機能がここに表示されます
              </p>
            </div>
          </div>

          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">AIチャットアシスタント</h2>
            <p className="text-gray-600 mb-4">
              ヘッダーの「AIチャット」ボタンをクリックして、AIアシスタントパネルを開きます。
              質問したり、ヘルプを受けたり、アイデアをブレインストーミングしたりできます!
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>リアルタイムAI応答</li>
              <li>コンテキストを理解した会話</li>
              <li>ワークスペースと統合</li>
            </ul>
          </div>
        </main>
      </div>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
