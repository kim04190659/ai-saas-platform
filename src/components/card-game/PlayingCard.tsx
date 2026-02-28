"use client";

/**
 * PlayingCard コンポーネント
 * トランプカードのUIを表現する。ホバーで3Dフリップアニメーション。
 *
 * 使い方:
 * <PlayingCard card={cardData} isSelected={true} onClick={() => {}} />
 */

// カードデータの型定義（APIから返ってくる形式と同じ）
export type CardData = {
  id: string;
  cardName: string;
  suit: string;
  rank: string;
  title: string;
  description: string;
  marketSize: number;
  monthlySales: number;
  unitPrice: number;
  variableCost: number;
  feasibilityScore: number;
};

type PlayingCardProps = {
  card: CardData;
  isSelected: boolean;   // 選択済みかどうか
  onClick: () => void;   // クリック時の処理
  showBack?: boolean;    // 裏面を表示するか（デフォルト: false = 表面表示）
};

// スート別の色とシンボルを定義
const SUIT_CONFIG: Record<string, { color: string; symbol: string; bg: string; label: string }> = {
  "♥️ハート": { color: "text-red-500", symbol: "♥", bg: "from-red-50 to-red-100", label: "ペルソナ" },
  "♦️ダイヤ": { color: "text-red-600", symbol: "♦", bg: "from-orange-50 to-orange-100", label: "問題・課題" },
  "♣️クラブ": { color: "text-gray-800", symbol: "♣", bg: "from-green-50 to-green-100", label: "パートナー" },
  "♠️スペード": { color: "text-gray-900", symbol: "♠", bg: "from-blue-50 to-blue-100", label: "ジョブタイプ" },
};

// 数値を見やすい形式にフォーマット（例: 1000000 → "100万"）
function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(0)}万`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}千`;
  return num.toLocaleString();
}

export default function PlayingCard({
  card,
  isSelected,
  onClick,
  showBack = false,
}: PlayingCardProps) {
  // スートに対応する設定を取得（見つからない場合はデフォルト値）
  const suitConfig = SUIT_CONFIG[card.suit] ?? {
    color: "text-gray-700",
    symbol: "?",
    bg: "from-gray-50 to-gray-100",
    label: "カード",
  };

  return (
    // カード全体のコンテナ（3D変換のための perspective を設定）
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: "1000px" }}
      onClick={onClick}
    >
      {/* カードの外枠（選択時に光るエフェクト） */}
      <div
        className={`
          relative w-36 h-52 rounded-2xl transition-all duration-300
          ${isSelected
            ? "ring-4 ring-yellow-400 ring-offset-2 shadow-2xl shadow-yellow-300 scale-105"
            : "shadow-lg hover:shadow-xl hover:-translate-y-2 hover:scale-102"
          }
        `}
        style={{
          transformStyle: "preserve-3d",
          transform: isSelected ? "rotateY(0deg)" : undefined,
        }}
      >
        {/* === カードの表面 === */}
        <div
          className={`
            absolute inset-0 rounded-2xl overflow-hidden
            bg-gradient-to-br ${suitConfig.bg}
            border-2 ${isSelected ? "border-yellow-400" : "border-white"}
          `}
        >
          {/* カード上部：ランクとスートシンボル */}
          <div className="flex justify-between items-start p-2">
            <div className="text-center">
              <div className={`text-2xl font-bold ${suitConfig.color} leading-none`}>
                {card.rank}
              </div>
              <div className={`text-sm ${suitConfig.color}`}>{suitConfig.symbol}</div>
            </div>
            {/* スートラベル（右上） */}
            <div className={`text-xs px-1.5 py-0.5 rounded-full bg-white/70 ${suitConfig.color} font-medium`}>
              {suitConfig.label}
            </div>
          </div>

          {/* カード中央：タイトル */}
          <div className="px-3 py-1 text-center">
            <div className={`text-3xl ${suitConfig.color} mb-1`}>{suitConfig.symbol}</div>
            <div className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">
              {card.title}
            </div>
          </div>

          {/* カード下部：スート別の数値情報 */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/60 rounded-b-2xl">
            {/* ♥️ハート → 市場規模と月間販売件数 */}
            {card.suit === "♥️ハート" && (
              <div className="text-center">
                <div className="text-xs text-gray-600">市場 {formatNumber(card.marketSize)}人</div>
                <div className="text-xs font-semibold text-red-600">月{formatNumber(card.monthlySales)}件</div>
              </div>
            )}
            {/* ♦️ダイヤ → 販売単価 */}
            {card.suit === "♦️ダイヤ" && (
              <div className="text-center">
                <div className="text-xs text-gray-600">販売単価</div>
                <div className="text-xs font-semibold text-orange-600">¥{formatNumber(card.unitPrice)}</div>
              </div>
            )}
            {/* ♣️クラブ → 月額変動費 */}
            {card.suit === "♣️クラブ" && (
              <div className="text-center">
                <div className="text-xs text-gray-600">月額変動費</div>
                <div className="text-xs font-semibold text-green-700">
                  {card.variableCost === 0 ? "無償" : `¥${formatNumber(card.variableCost)}`}
                </div>
              </div>
            )}
            {/* ♠️スペード → 実現可能性スコア */}
            {card.suit === "♠️スペード" && (
              <div className="text-center">
                <div className="text-xs text-gray-600">実現可能性</div>
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {/* スコアをドットで表現（10個中） */}
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        i < card.feasibilityScore ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 選択済みマーク */}
          {isSelected && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="bg-yellow-400 text-yellow-900 rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold shadow-lg">
                ✓
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
