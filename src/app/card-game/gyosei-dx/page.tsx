'use client';

// ===================================================
// 行政DXチャレンジ ゲームページ
// パス: src/app/(dashboard)/card-game/gyosei-dx/page.tsx
// 対象: 高専生向け 行政DX学習カードゲーム
// ===================================================

import { useState } from 'react';

// ---------------------------------------------------
// 型定義
// ---------------------------------------------------

/** 選択肢カードの型 */
interface Choice {
  id: string;           // 選択肢ID（a/b/c）
  label: string;        // カード表示テキスト
  score: number;        // 獲得スコア（0〜20）
  feedback: string;     // 選択後のフィードバックメッセージ
  tag: string;          // タグ表示（例: ✅ ベスト / 🔶 普通 / ❌ NG）
  tagColor: string;     // タグの色クラス
}

/** ステージの型 */
interface Stage {
  id: number;           // ステージ番号（1〜5）
  title: string;        // ステージタイトル
  theme: string;        // テーマアイコン＋名称
  situation: string;    // 状況説明テキスト
  mission: string;      // あなたへのミッション文
  choices: Choice[];    // 選択肢カード配列
}

/** ゲームのフェーズ */
type Phase =
  | 'intro'      // イントロ画面
  | 'playing'    // ゲームプレイ中
  | 'feedback'   // 選択後フィードバック表示
  | 'result';    // 最終結果画面

// ---------------------------------------------------
// ゲームデータ定義（5ステージ）
// ---------------------------------------------------
const STAGES: Stage[] = [
  {
    id: 1,
    title: '窓口DX作戦',
    theme: '🏛️ 窓口のデジタル化',
    situation:
      '南条市では毎日200人以上が窓口に並んでいます。住民票の申請だけで平均45分待ち。市民からのクレームが急増中。あなたは市長から「窓口をDXせよ！」と命じられました。',
    mission: '最も効果的な窓口デジタル化の第一手を選べ！',
    choices: [
      {
        id: 'a',
        label: 'マイナポータルと連携したオンライン申請システムを導入し、自宅から24時間申請できるようにする',
        score: 20,
        tag: '✅ ベスト',
        tagColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        feedback:
          '完璧な判断です！マイナポータル連携により既存インフラを活用でき、コストを抑えながら市民の利便性を大幅に向上できます。24時間対応で市民満足度も急上昇するでしょう。',
      },
      {
        id: 'b',
        label: '窓口に受付番号発券機を導入して、待ち時間をデジタル表示する',
        score: 10,
        tag: '🔶 普通',
        tagColor: 'bg-amber-100 text-amber-700 border-amber-300',
        feedback:
          '待ち時間の可視化は良いですが、根本的な解決にはなりません。窓口に来る必要性はなくならず、混雑そのものは改善されません。デジタル化の第一歩としては弱い施策です。',
      },
      {
        id: 'c',
        label: '窓口スタッフを2倍に増員して対応スピードを上げる',
        score: 0,
        tag: '❌ NG',
        tagColor: 'bg-red-100 text-red-700 border-red-300',
        feedback:
          'DXとは逆方向の施策です。人件費が増大するうえ、根本的な業務効率は変わりません。市の財政を圧迫し、持続可能性もありません。デジタル化の視点が欠けています。',
      },
    ],
  },
  {
    id: 2,
    title: 'AI導入大作戦',
    theme: '🤖 AI・チャットボット導入',
    situation:
      '南条市コールセンターには毎月3,000件の問い合わせが殺到。「ゴミの出し方」「証明書の取り方」など同じ質問が全体の70%を占めています。職員は疲弊し、複雑な相談への対応が後回しになっています。',
    mission: 'AIチャットボット導入計画として最善の戦略を選べ！',
    choices: [
      {
        id: 'a',
        label: 'FAQ上位100件に絞ったAIチャットボットをWebサイトとLINEに導入し、職員は複雑案件に集中する',
        score: 20,
        tag: '✅ ベスト',
        tagColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        feedback:
          '優れた戦略です！AIに得意な繰り返し業務を任せ、職員が高度な判断を要する業務に集中できます。LINEは市民の利用率が高く、導入効果も最大化できます。',
      },
      {
        id: 'b',
        label: 'すべての問い合わせ対応をAIに置き換え、コールセンターを廃止する',
        score: 5,
        tag: '🔶 普通',
        tagColor: 'bg-amber-100 text-amber-700 border-amber-300',
        feedback:
          '大胆すぎる判断です。現在のAI技術では複雑な相談・緊急案件・高齢者対応に限界があります。完全廃止は市民からの信頼を失うリスクがあります。段階的な移行が重要です。',
      },
      {
        id: 'c',
        label: 'まずは庁内ベンダーに「なんでもできるAI」を高額で発注し、完璧なシステムを目指す',
        score: 0,
        tag: '❌ NG',
        tagColor: 'bg-red-100 text-red-700 border-red-300',
        feedback:
          'ベンダーロックインと予算超過の典型的な失敗パターンです。「完璧なAI」は存在せず、要件定義が曖昧なまま高額発注すると使われないシステムが生まれます。スモールスタートが鉄則です。',
      },
    ],
  },
  {
    id: 3,
    title: 'マイナンバー活用ミッション',
    theme: '🔗 データ連携・マイナンバー活用',
    situation:
      '転居した市民が「引っ越しのたびに10種類の書類を各窓口に持参しなければならない」と悲鳴を上げています。住民票・税証明・保険証・学校転校手続き…同じ情報を何度も書かされます。',
    mission: 'マイナンバーを活用した「書かない窓口」実現策を選べ！',
    choices: [
      {
        id: 'a',
        label: 'マイナンバーカードをワンストップで読み取り、関係課のシステムを自動連携。市民は1回の来庁で手続き完了',
        score: 20,
        tag: '✅ ベスト',
        tagColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        feedback:
          '理想的な「書かない窓口」の実現です！国のデジタル庁が推進するモデルと一致しており、補助金も活用できます。市民体験が劇的に改善し、職員の入力ミスも激減します。',
      },
      {
        id: 'b',
        label: '手続きに必要な書類リストを分かりやすくWebで公開し、来庁前に準備できるようにする',
        score: 8,
        tag: '🔶 普通',
        tagColor: 'bg-amber-100 text-amber-700 border-amber-300',
        feedback:
          '情報発信の改善は重要ですが、DXの本質ではありません。書類を準備する手間は残り、市民の負担は根本的に解決されません。デジタル化による「書類不要」を目指すべきです。',
      },
      {
        id: 'c',
        label: 'マイナンバーカードは個人情報漏洩リスクがあるので、現行の紙ベース運用を継続する',
        score: 0,
        tag: '❌ NG',
        tagColor: 'bg-red-100 text-red-700 border-red-300',
        feedback:
          'リスクゼロはありませんが、マイナンバーの安全性は法制度・暗号化で担保されています。現状維持はDX放棄に等しく、国の方針にも逆行します。リスク管理と活用推進を両立させることが重要です。',
      },
    ],
  },
  {
    id: 4,
    title: '内部改革チャレンジ',
    theme: '📋 内部業務のデジタル化',
    situation:
      '職員の田中さんは毎日2時間、紙の書類をExcelに手入力しています。「このデータ、別のシステムにも同じものがあるのに…」と嘆いています。課長はIT苦手で「紙が一番確実だ」と言い張ります。',
    mission: '職員のデジタル化抵抗を乗り越える最善策を選べ！',
    choices: [
      {
        id: 'a',
        label: '課長も巻き込んだ小さなPoC（試験導入）を実施し、「便利さ」を体験してもらってから全体展開する',
        score: 20,
        tag: '✅ ベスト',
        tagColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        feedback:
          'DX推進の王道パターンです！抵抗勢力を説得するより、体験させることが最速の近道。小さな成功体験を積み重ねて「便利だ」と感じてもらうことで、組織文化が変わります。',
      },
      {
        id: 'b',
        label: '市長権限でトップダウン命令を出し、全課一斉にペーパーレス化を強制する',
        score: 5,
        tag: '🔶 普通',
        tagColor: 'bg-amber-100 text-amber-700 border-amber-300',
        feedback:
          'スピードは出ますが、現場の反発で形骸化するリスクが高いです。「命令されたからやっている」状態では定着しません。職員が主体的に使いたくなる仕組みづくりが重要です。',
      },
      {
        id: 'c',
        label: '課長の意見を尊重し、現状の紙運用を続けながら田中さんだけにタブレットを支給する',
        score: 0,
        tag: '❌ NG',
        tagColor: 'bg-red-100 text-red-700 border-red-300',
        feedback:
          '個人対応では組織改革は起きません。田中さんだけが孤立し、二重管理が生まれるだけです。課題の本質は「組織の変革」であり、個人への道具提供では根本解決になりません。',
      },
    ],
  },
  {
    id: 5,
    title: '市長プレゼン大作戦',
    theme: '🎤 DX成果の最終報告',
    situation:
      '3年間のDX推進が終わり、市長への最終報告の日がやってきました。「市民満足度・コスト削減・職員負荷」の3点で評価されます。あなたはどのようにプレゼンしますか？',
    mission: '市長を納得させる最強のプレゼン戦略を選べ！',
    choices: [
      {
        id: 'a',
        label: '市民満足度調査・コスト削減額・残業時間削減のデータを揃え「市民の声」と「数字」で成果を証明する',
        score: 20,
        tag: '✅ ベスト',
        tagColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        feedback:
          '完璧なプレゼン戦略です！DXの成果は「感覚」でなく「データ」で示すことが重要。市民の声は感情に訴え、数字は理性に訴えます。この組み合わせが最も説得力を持ちます。',
      },
      {
        id: 'b',
        label: '導入したシステムの機能一覧をスライドにまとめ「これだけ多くのシステムを入れました」と報告する',
        score: 5,
        tag: '🔶 普通',
        tagColor: 'bg-amber-100 text-amber-700 border-amber-300',
        feedback:
          'インプット（何を入れたか）の報告になっています。市長が知りたいのはアウトカム（何が変わったか）です。「システムを入れた」ではなく「市民が幸せになった」を証明しましょう。',
      },
      {
        id: 'c',
        label: '「DXは難しいので3年では無理でした。もう3年ください」と正直に報告する',
        score: 0,
        tag: '❌ NG',
        tagColor: 'bg-red-100 text-red-700 border-red-300',
        feedback:
          '正直さは美徳ですが、これは戦略的失敗です。小さな成果でも必ず出ているはず。「完璧でなくても前進した証拠」を示すことがDXリーダーの役割です。諦めたら変革は止まります。',
      },
    ],
  },
];

// ---------------------------------------------------
// 評価ランク定義（最終スコアに応じたフィードバック）
// ---------------------------------------------------
const getRank = (score: number): { rank: string; message: string; color: string } => {
  if (score >= 90) return { rank: 'DX大臣', message: '完璧な判断力！あなたは次世代の行政DXリーダーです。ぜひ実際の自治体改革に挑戦してください！', color: 'text-sky-600' };
  if (score >= 70) return { rank: 'DXエース', message: '優秀な成績！DXの本質をよく理解しています。あとは実践あるのみ！', color: 'text-emerald-600' };
  if (score >= 50) return { rank: 'DX見習い', message: '悪くない判断ですが、まだ改善の余地あり。DXの目的（市民の幸せ）を常に意識しよう！', color: 'text-amber-600' };
  return { rank: 'DX研修生', message: '学びの多いゲームでしたね！DXは「技術」より「目的」が大切。もう一度チャレンジしてみよう！', color: 'text-red-600' };
};

// ---------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------
export default function GyoseiDxPage() {
  // ゲームの状態管理
  const [phase, setPhase] = useState<Phase>('intro');               // 現在のフェーズ
  const [currentStageIndex, setCurrentStageIndex] = useState(0);   // 現在のステージ番号
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null); // 選択した回答
  const [scores, setScores] = useState<number[]>([]);               // 各ステージのスコア記録
  const [chosenLabels, setChosenLabels] = useState<string[]>([]);   // 各ステージの選択内容記録

  // 現在のステージデータ
  const currentStage = STAGES[currentStageIndex];

  // 合計スコアの計算（100点満点換算）
  const totalScore = Math.round((scores.reduce((a, b) => a + b, 0) / (STAGES.length * 20)) * 100);

  // ---------------------------------------------------
  // イベントハンドラ
  // ---------------------------------------------------

  /** ゲーム開始 */
  const handleStart = () => {
    setPhase('playing');
    setCurrentStageIndex(0);
    setScores([]);
    setChosenLabels([]);
    setSelectedChoice(null);
  };

  /** 選択肢カードをクリックしたとき */
  const handleChoiceSelect = (choice: Choice) => {
    setSelectedChoice(choice);
    setScores((prev) => [...prev, choice.score]);
    setChosenLabels((prev) => [...prev, choice.label]);
    setPhase('feedback');
  };

  /** 次のステージへ進む */
  const handleNext = () => {
    if (currentStageIndex + 1 >= STAGES.length) {
      // 全ステージクリア → 結果画面へ
      setPhase('result');
    } else {
      // 次のステージへ
      setCurrentStageIndex((prev) => prev + 1);
      setSelectedChoice(null);
      setPhase('playing');
    }
  };

  /** もう一度チャレンジ */
  const handleRetry = () => {
    setPhase('intro');
    setCurrentStageIndex(0);
    setScores([]);
    setChosenLabels([]);
    setSelectedChoice(null);
  };

  // ---------------------------------------------------
  // レンダリング: イントロ画面
  // ---------------------------------------------------
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* タイトルカード */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* ヘッダー帯 */}
            <div className="bg-sky-600 px-8 py-6 text-center">
              <div className="text-5xl mb-2">🏛️</div>
              <h1 className="text-2xl font-bold text-white">行政DXチャレンジ</h1>
              <p className="text-sky-200 text-sm mt-1">高専生のためのDX体験ゲーム</p>
            </div>

            {/* ストーリー説明 */}
            <div className="px-8 py-6">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 mb-6">
                <p className="text-slate-700 text-sm leading-relaxed">
                  📜 <span className="font-bold text-sky-700">ストーリー</span>
                  <br /><br />
                  あなたは某市役所に配属された<span className="font-bold">新人IT職員</span>。<br />
                  市長から「<span className="font-bold text-sky-600">3年でDXを実現せよ！</span>」という特命を受けた。<br /><br />
                  窓口の長蛇の列、山積みの紙書類、疲弊する職員…<br />
                  5つの課題を乗り越えて、<span className="font-bold">市民の笑顔を取り戻せ！</span>
                </p>
              </div>

              {/* ゲーム説明 */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: '🃏', label: '5ステージ', desc: 'DX課題に挑戦' },
                  { icon: '💡', label: '3択カード', desc: 'ベストを選ぼう' },
                  { icon: '📊', label: '結果レポート', desc: 'DX力を診断' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="font-bold text-slate-700 text-xs">{item.label}</div>
                    <div className="text-slate-500 text-xs">{item.desc}</div>
                  </div>
                ))}
              </div>

              {/* スタートボタン */}
              <button
                onClick={handleStart}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-sm"
              >
                🚀 チャレンジ開始！
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------
  // レンダリング: 最終結果画面
  // ---------------------------------------------------
  if (phase === 'result') {
    const { rank, message, color } = getRank(totalScore);

    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* 結果カード */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            {/* ヘッダー */}
            <div className="bg-sky-600 px-8 py-6 text-center">
              <div className="text-5xl mb-2">🎉</div>
              <h2 className="text-xl font-bold text-white">チャレンジ完了！</h2>
            </div>

            <div className="px-8 py-6">
              {/* スコア表示 */}
              <div className="text-center mb-6">
                <div className="text-7xl font-bold text-sky-600 mb-1">{totalScore}</div>
                <div className="text-slate-500 text-sm">/ 100 点</div>
                <div className={`text-2xl font-bold mt-3 ${color}`}>あなたの称号：{rank}</div>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">{message}</p>
              </div>

              {/* 進捗バー */}
              <div className="mb-6">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                    style={{ width: `${totalScore}%` }}
                  />
                </div>
              </div>

              {/* ステージ別振り返り */}
              <h3 className="font-bold text-slate-700 mb-3">📋 ステージ別レポート</h3>
              <div className="space-y-3">
                {STAGES.map((stage, i) => (
                  <div key={stage.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-700 text-sm">
                        Stage {stage.id}：{stage.title}
                      </span>
                      <span className={`text-sm font-bold ${scores[i] === 20 ? 'text-emerald-600' : scores[i] >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                        {scores[i]}点 / 20点
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      あなたの選択：「{chosenLabels[i]?.substring(0, 30)}…」
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* もう一度チャレンジボタン */}
          <button
            onClick={handleRetry}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-colors shadow-sm"
          >
            🔄 もう一度チャレンジ
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------
  // レンダリング: ゲームプレイ画面 ＆ フィードバック画面
  // ---------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">

        {/* 進捗ヘッダー */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sky-700 font-bold text-sm">
              Stage {currentStage.id} / {STAGES.length}
            </span>
            <span className="text-slate-500 text-sm">
              現在のスコア：{scores.reduce((a, b) => a + b, 0)}点
            </span>
          </div>
          {/* 進捗バー */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentStageIndex) / STAGES.length) * 100}%` }}
            />
          </div>
          {/* ステージドット */}
          <div className="flex justify-between mt-2">
            {STAGES.map((s) => (
              <div
                key={s.id}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  s.id < currentStage.id
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : s.id === currentStage.id
                    ? 'bg-white border-sky-600 text-sky-600'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {s.id < currentStage.id ? '✓' : s.id}
              </div>
            ))}
          </div>
        </div>

        {/* ステージカード */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          {/* ステージヘッダー */}
          <div className="bg-sky-600 px-6 py-4">
            <div className="text-sky-200 text-xs font-bold mb-1">{currentStage.theme}</div>
            <h2 className="text-white font-bold text-lg">{currentStage.title}</h2>
          </div>

          <div className="px-6 py-5">
            {/* 状況説明 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
              <div className="text-xs font-bold text-slate-500 mb-2">📌 状況説明</div>
              <p className="text-slate-700 text-sm leading-relaxed">{currentStage.situation}</p>
            </div>

            {/* ミッション */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-5">
              <p className="text-sky-700 font-bold text-sm">🎯 {currentStage.mission}</p>
            </div>

            {/* 選択肢カード群（プレイ中のみ表示） */}
            {phase === 'playing' && (
              <div className="space-y-3">
                {currentStage.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoiceSelect(choice)}
                    className="w-full text-left bg-white border-2 border-slate-200 hover:border-sky-400 hover:bg-sky-50 rounded-xl p-4 transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {/* 選択肢ラベル（A/B/C） */}
                      <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                        {choice.id.toUpperCase()}
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">{choice.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* フィードバック表示（選択後） */}
            {phase === 'feedback' && selectedChoice && (
              <div className="space-y-4">
                {/* 選んだカードの結果 */}
                <div className={`border-2 rounded-xl p-4 ${selectedChoice.score === 20 ? 'border-emerald-300 bg-emerald-50' : selectedChoice.score >= 5 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${selectedChoice.tagColor}`}>
                      {selectedChoice.tag}
                    </span>
                    <span className="font-bold text-slate-700">{selectedChoice.score}点 獲得</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">「{selectedChoice.label}」</p>
                </div>

                {/* フィードバックメッセージ */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 mb-2">💬 解説</div>
                  <p className="text-slate-700 text-sm leading-relaxed">{selectedChoice.feedback}</p>
                </div>

                {/* 次へボタン */}
                <button
                  onClick={handleNext}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-colors shadow-sm"
                >
                  {currentStageIndex + 1 >= STAGES.length ? '📊 結果を見る' : '次のステージへ →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
