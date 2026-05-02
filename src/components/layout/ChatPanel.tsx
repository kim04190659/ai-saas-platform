'use client';

/**
 * ChatPanel.tsx — Sprint #77 全面リニューアル
 *
 * ■ 改善点
 *   ① 全ページ対応：usePathname() で現在ページを検出し、
 *      PAGE_CONTEXTS マップから「そのページの使い方支援」コンテキストを自動選択
 *   ② 名前を統一：どのページ・どの自治体でも「RunWithアシスタント」で統一
 *   ③ 内容を統一：システムプロンプトを「ページの使い方を教える」方向に統一
 *      （旧: ScenarioContext / KirishimaChatPanel のような専門AIアドバイザーを廃止）
 *   ④ KirishimaChatPanel を統合：霧島市ページも本コンポーネントで対応
 *   ⑤ サジェスト質問を各ページの操作に即した内容に統一
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Send, X, Bot } from 'lucide-react';

// ─── 型定義 ───────────────────────────────────────────────

type PageContext = {
  pageTitle: string;       // パネルヘッダーに表示するページ名
  description: string;    // 初期メッセージ（このページでできること）
  systemPrompt: string;   // Claude API へ渡すシステムプロンプト
  suggestions: string[];  // 初期表示のサジェスト質問（最大4件）
};

// ─── ページ別コンテキスト定義 ─────────────────────────────
// キー：URL パス（クエリパラメータなし）
// 値：そのページ専用の使い方支援コンテキスト

const PAGE_CONTEXTS: Record<string, PageContext> = {

  // ── ホーム ─────────────────────────────────────────────
  '/': {
    pageTitle: 'RunWith Platform トップ',
    description: 'RunWith Platformへようこそ。左メニューから各機能にアクセスできます。どこから始めれば良いか迷ったらお気軽にどうぞ。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。
ユーザーが最初に開くトップページです。各機能の紹介・左メニューの使い方・どのページから始めれば良いかを案内してください。
自治体職員（非エンジニア）向けに、専門用語を避けてわかりやすく回答してください。回答は400字以内で簡潔に。`,
    suggestions: ['どのページから始めればいい？', '左メニューの構成を教えて', 'WBダッシュボードとは？', 'AI機能の一覧を教えて'],
  },

  // ── 必須機能 ──────────────────────────────────────────
  '/gyosei/dashboard': {
    pageTitle: 'Well-Beingダッシュボード',
    description: '自治体のWell-Being指標・KPI・住民満足度を一覧で確認できます。上部のセレクターで自治体を切り替えると、その自治体のデータに切り替わります。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Well-Beingダッシュボード」です。
このページでは、選択中の自治体のWell-Being指標（市民満足度・職員コンディション・KPIスナップショット）を一覧表示しています。
ページの見方・自治体の切り替え方・各指標の意味・データ更新方法について、わかりやすく説明してください。
自治体職員（非エンジニア）向けに、専門用語を避えて回答してください。回答は400字以内。`,
    suggestions: ['このページの見方を教えて', '自治体を切り替えるには？', 'KPIが赤くなっているのはなぜ？', 'Well-Beingスコアの意味は？'],
  },
  '/gyosei/staff': {
    pageTitle: '職員コンディション管理',
    description: '職員のWell-Beingスコア・体調・業務負荷をNotionから取得して一覧表示します。スコアが低い職員への対応検討に使います。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「職員コンディション管理」です。
このページでは、Notionに蓄積された職員のWell-Beingスコア・体調・業務負荷・手応えを一覧表示しています。
ページの見方・データの入力方法・スコアが低い職員への対応手順について説明してください。
自治体職員向けに、専門用語を避けて回答してください。回答は400字以内。`,
    suggestions: ['スコアが低い職員への対応は？', 'データはどこから来ていますか？', 'コンディションの入力方法は？', '全体傾向を見るには？'],
  },
  '/staff/line': {
    pageTitle: 'LINE業務対応',
    description: 'LINE経由で届いた住民の相談メッセージを一覧表示し、AI補助で迅速に対応できます。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「LINE業務対応」です。
このページでは、住民からLINEで届いた相談・問い合わせを一覧表示し、AI補助で返答案を生成できます。
操作手順・AI返答案の使い方・未対応件の絞り込み方法・対応履歴の確認方法について説明してください。
回答は400字以内。`,
    suggestions: ['AIの返答案はどう使う？', '未対応の件を絞り込むには？', 'LINEとの連携設定は？', '対応履歴を見るには？'],
  },
  '/staff/ai-suggest': {
    pageTitle: 'AI窓口即時提案',
    description: '窓口で住民から受けた相談内容を入力すると、AIが即座に対応案・関連サービス・担当部署を提案します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「AI窓口即時提案」です。
このページでは、窓口相談の内容を入力すると、AIが対応案・関連する行政サービス・担当部署を提案します。
入力欄への書き方・AI提案の活用方法・提案が不十分なときの対処・対応履歴の残し方について説明してください。
回答は400字以内。`,
    suggestions: ['どんな相談に使えますか？', '入力欄に何を書けばいい？', '提案内容が不十分なときは？', '対応履歴は残りますか？'],
  },

  // ── 住民接点 ──────────────────────────────────────────
  '/gyosei/services': {
    pageTitle: '住民サービス状況',
    description: '住民向け行政サービスの利用状況・満足度・SDL五軸スコアを一覧表示します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「住民サービス状況」です。
このページでは、各行政サービスの利用件数・住民満足度・SDL五軸スコアをNotionから取得して表示しています。
SDL五軸とは「共創・文脈・資源・統合・価値」の5つの観点でサービスを評価するフレームワークです。
データの見方・サービスの追加方法・SDL五軸の活用について説明してください。回答は400字以内。`,
    suggestions: ['SDL五軸スコアの見方は？', 'サービスを追加するには？', 'どのサービスを改善すべき？', 'データはどこから来ていますか？'],
  },
  '/gyosei/line-consultation': {
    pageTitle: 'LINE相談管理',
    description: 'LINE経由で届いた住民相談の集計・分類・傾向分析ができます。自治体を切り替えるとその自治体のデータを表示します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「LINE相談管理」です。
このページでは、LINEで届いた住民相談をカテゴリ別・時系列で集計・分析しています。
相談カテゴリの見方・自治体の切り替え方・傾向分析の活用方法・Notionへのデータ追加について説明してください。
回答は400字以内。`,
    suggestions: ['相談カテゴリはどう見る？', '自治体を切り替えるには？', '急増しているカテゴリの見方は？', 'Notionへのデータ追加方法は？'],
  },
  '/gyosei/touchpoints': {
    pageTitle: 'タッチポイント記録',
    description: '住民が行政と接触した記録（窓口・電話・LINE・オンライン）を一覧・集計表示します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「タッチポイント記録」です。
タッチポイントとは住民が行政と接触した記録（チャネル・満足度・解決時間）のことです。
チャネル別集計の見方・満足度が低い接触への対処・データの追加方法について説明してください。回答は400字以内。`,
    suggestions: ['タッチポイントとは何ですか？', 'チャネル別の集計を見るには？', '満足度が低い接触の対処は？', 'データを追加するには？'],
  },
  '/gyosei/push-notifications': {
    pageTitle: '住民プッシュ通知',
    description: '住民へのプッシュ通知（LINE・メール等）の配信設定・配信状況・開封率を管理します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「住民プッシュ通知」です。
このページでは、住民向け通知の配信設定・対象者の絞り込み・配信後の開封状況を管理します。
通知の作成手順・配信対象の設定・配信結果の見方について説明してください。回答は400字以内。`,
    suggestions: ['通知を作成するには？', '配信対象を絞り込むには？', '開封率の見方は？', '配信に失敗した場合は？'],
  },

  // ── 職員支援 ──────────────────────────────────────────
  '/gyosei/document-generator': {
    pageTitle: 'AI文書自動起案',
    description: '目的・条件を入力するだけで、AIが行政文書の草案を自動生成します。稟議書・通知文・報告書などに対応。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「AI文書自動起案」です。
このページでは、文書の種類・目的・条件を入力すると、AIが行政文書の草案を生成します。
入力欄への書き方・生成された文書の修正・保存・活用方法について説明してください。回答は400字以内。`,
    suggestions: ['どんな文書を作れますか？', '入力欄に何を書けばいい？', '生成した文書の修正方法は？', '稟議書はどう作ればいい？'],
  },
  '/gyosei/predictive-alerts': {
    pageTitle: '予兆検知ダッシュボード',
    description: 'AIが住民データ・職員データを分析し、問題が起きる前に予兆を検知して警告します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「予兆検知ダッシュボード」です。
このページでは、各種データからAIが潜在的なリスク・問題の予兆を検知してアラートとして表示します。
アラートの見方・優先度の判断方法・対応手順・検知の仕組みについて説明してください。回答は400字以内。`,
    suggestions: ['アラートの見方を教えて', '優先度はどう判断する？', '予兆検知のデータ元は？', 'アラートへの対応手順は？'],
  },
  '/gyosei/citizen-radar': {
    pageTitle: '住民困り事レーダー',
    description: 'RSSニュース・相談データをAIが分析し、地域住民が今困っていることをリアルタイムで可視化します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「住民困り事レーダー」です。
このページでは、ニュース・相談データをAIが分析し、住民が今困っていることをカテゴリ別に表示します。
データの見方・更新タイミング・施策立案への活用方法について説明してください。回答は400字以内。`,
    suggestions: ['データはどこから来ていますか？', 'どれくらいの頻度で更新される？', '困り事カテゴリの見方は？', '施策立案にどう使う？'],
  },
  '/gyosei/issue-policy': {
    pageTitle: '困り事→施策提案',
    description: '住民の困り事を入力すると、AIが具体的な施策案・参考事例・実施ステップを提案します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「困り事→施策提案」です。
このページでは、困り事や課題を入力すると、AIが具体的な施策案・自治体事例・実施ステップを提案します。
入力欄への書き方・提案結果の活用・他自治体事例の確認方法について説明してください。回答は400字以内。`,
    suggestions: ['どんな入力をすればいい？', '提案された施策の採用方法は？', '他の自治体事例はどこで見える？', '複数の施策を比較するには？'],
  },
  '/gyosei/weekly-summary': {
    pageTitle: '週次WBサマリー生成',
    description: '1週間分の住民・職員データをAIが集計・要約し、週次レポートを自動生成します。NotionへもワンクリックでOK。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「週次WBサマリー生成」です。
このページでは、1週間分のWell-Beingデータをまとめ、AIが週次サマリーを自動生成してNotionに保存します。
サマリーの生成手順・Notionへの保存方法・サマリーの読み方について説明してください。回答は400字以内。`,
    suggestions: ['サマリーの生成手順は？', 'Notionへの保存方法は？', 'サマリーの見方を教えて', '毎週自動で動かすには？'],
  },
  '/gyosei/emergency-support': {
    pageTitle: '緊急時住民支援',
    description: '災害・緊急時に支援が必要な住民の優先順位をAIが自動判定し、対応リストを生成します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「緊急時住民支援」です。
このページでは、緊急時に支援が必要な住民（高齢者・障がい者等）の優先度をAIが算出してリスト化します。
優先順位の見方・リストの実際の使い方・住民データの更新方法について説明してください。回答は400字以内。`,
    suggestions: ['優先順位の判断基準は？', '住民リストを更新するには？', '実際の避難支援でどう使う？', 'データはどこから来ていますか？'],
  },
  '/gyosei/risk-scoring': {
    pageTitle: '離職リスクスコアリング',
    description: '職員のWell-Beingデータをもとに、AIが離職リスクの高い職員をスコアリングして表示します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「離職リスクスコアリング」です。
このページでは、職員のコンディションデータからAIが離職リスクをスコア化して一覧表示します。
スコアの見方・対応優先度の判断・フォローアップ手順について説明してください。回答は400字以内。`,
    suggestions: ['スコアの見方を教えて', 'リスクが高い職員への対応は？', 'スコアの計算基準は？', 'データはどこから取っていますか？'],
  },

  // ── 経営・政策 ────────────────────────────────────────
  '/ai-advisor': {
    pageTitle: 'AI Well-Being顧問',
    description: '自治体全体のWell-Beingデータを踏まえ、AIが施策提言・改善優先順位・KPI分析を行います。首長・部長級の政策判断支援に。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「AI Well-Being顧問」です。
このページでは、蓄積データをもとにAIが総合的な政策提言・Well-Being改善施策・優先度判断を提供します。
ページの操作手順・提言の読み方・自治体別データへの切り替え・結果の活用方法について説明してください。
回答は400字以内。`,
    suggestions: ['提言はどう読めばいい？', '自治体を切り替えるには？', '提言の信頼性は？', '分析を再実行するには？'],
  },
  '/gyosei/management-dashboard': {
    pageTitle: '経営ダッシュボード',
    description: '財政・人口・インフラ・WellBeingの4軸をまとめた首長・管理職向け経営指標ダッシュボードです。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「経営ダッシュボード」です。
このページでは、財政健全化・人口動態・インフラ状態・Well-Beingの4軸を総合した経営指標を表示します。
各軸の見方・赤い指標への対処・自治体切り替え・首長への報告活用について説明してください。回答は400字以内。`,
    suggestions: ['4軸の見方を教えて', '赤い指標はどう対処する？', '自治体を切り替えるには？', '首長への報告にどう使う？'],
  },
  '/gyosei/fiscal-health': {
    pageTitle: '財政健全化管理',
    description: '実質公債費比率・経常収支比率などの財政指標をAIが分析し、改善提言を出します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「財政健全化管理」です。
このページでは、自治体の財政健全化指標をNotionから取得し、AIが改善提言を生成します。
財政指標の意味・AIの提言の活用方法・データ更新手順について説明してください。回答は400字以内。`,
    suggestions: ['財政力指数の見方は？', '改善提言はどう活用する？', '実質公債費比率が高い場合は？', 'データを最新にするには？'],
  },
  '/gyosei/infra-aging': {
    pageTitle: 'インフラ老朽化管理',
    description: '道路・橋梁・施設の老朽化状況をAIが分析し、優先的に対応すべき施設と修繕計画を提案します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「インフラ老朽化管理」です。
このページでは、インフラ施設の老朽化度・修繕優先度・AIによる対応提言を表示します。
優先度の見方・施設データの管理・修繕計画への活用について説明してください。回答は400字以内。`,
    suggestions: ['優先度の高い施設はどれ？', 'AIの提言の使い方は？', '施設データを追加するには？', '修繕計画を作るには？'],
  },
  '/gyosei/quarterly-report': {
    pageTitle: '四半期AI分析レポート',
    description: '3ヶ月分のデータをAIが自動集計・分析した四半期報告書を生成します。議会・上位機関への報告書作成に。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「四半期AI分析レポート」です。
このページでは、3ヶ月分のWell-Being・財政・人口データをAIが分析し、四半期報告書を自動生成します。
レポートの生成手順・内容の読み方・出力・共有方法について説明してください。回答は400字以内。`,
    suggestions: ['レポートの生成手順は？', 'レポートをPDF出力するには？', '対象期間を変えるには？', '議会報告にどう使う？'],
  },
  '/gyosei/dx-effectiveness': {
    pageTitle: 'DX効果測定',
    description: 'DX施策の投資対効果・業務時間削減率・住民満足度への影響をAIが定量的に測定します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「DX効果測定」です。
このページでは、DX施策の効果（コスト削減・時間削減・満足度改善）をAIが定量的に分析します。
測定指標の見方・ROI計算の方法・結果の上位報告への活用について説明してください。回答は400字以内。`,
    suggestions: ['ROIの見方を教えて', '効果が出ていない施策は？', 'データはどこから取得？', '上位への報告にどう使う？'],
  },
  '/gyosei/population': {
    pageTitle: '人口・地域データ',
    description: '人口推移・年齢構成・地区別分布・将来予測をグラフで可視化します。政策立案の基礎データとして活用。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「人口・地域データ」です。
このページでは、人口の推移・年齢別構成・地域別分布・将来推計をグラフ表示します。
グラフの見方・データの更新方法・政策立案への活用方法について説明してください。回答は400字以内。`,
    suggestions: ['グラフの見方を教えて', '人口減少のペースはどのくらい？', '地区別データはどこで見る？', 'データを更新するには？'],
  },
  '/gyosei/revenue': {
    pageTitle: '収益・財政データ',
    description: '税収・交付金・歳出の推移を自治体別に表示します。財政状況の把握と予算計画に活用。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「収益・財政データ」です。
このページでは、自治体の税収・交付金・各種歳出の推移をグラフで表示します。
財政データの見方・自治体切り替え・グラフ期間の変更方法について説明してください。回答は400字以内。`,
    suggestions: ['税収データの見方は？', '自治体を切り替えるには？', 'グラフの期間を変えるには？', 'データが古い場合は？'],
  },
  '/gyosei/shrink-scenario': {
    pageTitle: '縮小シナリオ×地区WellBeing',
    description: '人口縮小が進む各地区の将来シナリオとWell-Being影響を可視化し、重点支援地区を特定します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「縮小シナリオ×地区WellBeing」です。
このページでは、人口縮小シナリオと地区別Well-Beingの相関を分析し、重点支援が必要な地区を特定します。
シナリオの見方・地区の絞り込み・政策立案への活用について説明してください。回答は400字以内。`,
    suggestions: ['シナリオの見方を教えて', '重点支援地区はどう特定する？', 'データはどこから来ていますか？', '政策立案にどう活かす？'],
  },
  '/gyosei/compare': {
    pageTitle: '類似自治体比較分析',
    description: '人口規模・財政・WellBeingが類似した他の自治体との比較ができます。施策のベンチマークに。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「類似自治体比較分析」です。
このページでは、規模・財政・WellBeingが似た他自治体を自動でピックアップして比較表示します。
比較の見方・ベンチマーク活用・比較対象の変更方法について説明してください。回答は400字以内。`,
    suggestions: ['比較対象はどう選ばれる？', 'ベンチマークの使い方は？', '指標を追加して比較するには？', '比較結果を資料にするには？'],
  },
  '/gyosei/document-gen': {
    pageTitle: 'AI政策文書生成',
    description: '政策目的・対象・根拠データを入力すると、AIが政策文書・計画書・報告書の草案を生成します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「AI政策文書生成」です。
このページでは、政策の目的・対象・データを入力するとAIが政策文書の草案を生成します。
入力方法・生成結果の活用・文書の修正・保存方法について説明してください。回答は400字以内。`,
    suggestions: ['どんな文書を作れますか？', '入力に必要な情報は？', '生成結果の修正方法は？', 'Notionに保存するには？'],
  },

  // ── 課題特化型AI ─────────────────────────────────────
  '/gyosei/migration-risk': {
    pageTitle: '移住定着リスクAI',
    description: '移住相談データをAIが分析し、定着リスクの高い移住者を早期に特定して支援施策を提案します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「移住定着リスクAI」です。
このページでは、移住者の相談・状況データからAIが定着リスクを分析し、支援が必要な方を特定します。
リスクスコアの見方・支援施策の読み方・高リスク移住者への対応手順について説明してください。回答は400字以内。`,
    suggestions: ['リスクスコアの見方は？', '高リスク移住者への対応は？', 'データを追加するには？', 'AIの判断基準は？'],
  },
  '/gyosei/visit-priority': {
    pageTitle: '往診優先順位AI',
    description: '在宅医療・訪問看護が必要な高齢者の優先順位をAIが判定し、効率的な訪問スケジュールを提案します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「往診優先順位AI」です。
このページでは、在宅医療が必要な方の健康状態・緊急度をAIが分析し、往診優先順位を決定します。
優先順位の見方・リストの活用方法・患者データの更新手順について説明してください。回答は400字以内。`,
    suggestions: ['優先順位の基準は？', 'リストの活用方法は？', '患者データを追加するには？', '緊急度が高い場合の対応は？'],
  },
  '/gyosei/carbon-tracker': {
    pageTitle: 'CO2削減進捗トラッカー',
    description: 'CO2削減活動（太陽光・省エネ・再利用等）の実績をトラッキングし、目標達成率・AIの改善提言を表示します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「CO2削減進捗トラッカー」です。
このページでは、CO2削減活動の実績・目標達成率・AIによる追加改善提言を表示します。
目標達成率の見方・活動データの追加方法・AIの改善提言の活用について説明してください。回答は400字以内。`,
    suggestions: ['目標達成率の見方は？', '活動データを追加するには？', 'AIの改善提言の使い方は？', '月別トレンドはどこで見る？'],
  },
  '/gyosei/farm-matching': {
    pageTitle: '農業担い手マッチングAI',
    description: '農地情報と就農希望者データをAIがマッチングし、最適な担い手候補を提案します。農業継承問題の解決に。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「農業担い手マッチングAI」です。
このページでは、農地データと就農希望者データをAIがマッチングして候補者リストを生成します。
マッチング結果の見方・農地・希望者データの登録・管理方法について説明してください。回答は400字以内。`,
    suggestions: ['マッチング結果の見方は？', '農地データを追加するには？', '就農希望者を登録するには？', 'マッチングの精度を上げるには？'],
  },
  '/gyosei/childcare-risk': {
    pageTitle: '子育て流出リスクAI',
    description: '子育て世帯の相談データからAIが転出リスクを分析し、引き留め施策を提案します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「子育て流出リスクAI」です。
このページでは、子育て相談データからAIが転出リスクの高い世帯を特定し、施策案を提案します。
リスクスコアの見方・施策案の活用・データ更新手順について説明してください。回答は400字以内。`,
    suggestions: ['リスクスコアの見方は？', '転出リスクが高い世帯への対応は？', 'データを追加するには？', 'AIの分析基準は？'],
  },
  '/gyosei/recovery-dashboard': {
    pageTitle: '復興進捗ダッシュボード',
    description: '災害復興の進捗状況（インフラ・住宅・産業・住民支援）をフェーズ別に可視化し、AIが遅延リスクを警告します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「復興進捗ダッシュボード」です。
このページでは、災害復興の進捗をフェーズ別・カテゴリ別に表示し、遅延リスクをAIが検知します。
進捗の見方・遅延警告への対処・データ更新方法について説明してください。回答は400字以内。`,
    suggestions: ['進捗の見方を教えて', '遅延リスクの警告はどう対応する？', 'データを更新するには？', 'フェーズ別の見方は？'],
  },
  '/gyosei/local-industry': {
    pageTitle: '地場産業6次産業化支援AI',
    description: '地場産業の現状データをAIが分析し、6次産業化（生産×加工×販売）の具体的な推進施策を提案します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「地場産業6次産業化支援AI」です。
このページでは、地場産業台帳データからAIが6次産業化の可能性と具体的施策を提案します。
分析結果の見方・施策案の活用・産業台帳データの更新について説明してください。回答は400字以内。`,
    suggestions: ['6次産業化とは何ですか？', '提案施策の使い方は？', '産業台帳を更新するには？', 'どの産業を優先すべき？'],
  },

  // ── 霧島市 ───────────────────────────────────────────
  '/kirishima': {
    pageTitle: '霧島市 RunWith トップ',
    description: '霧島市専用のRunWithダッシュボードへようこそ。4グループ（必須機能・基本AI・課題特化型AI・研修学習）の全機能にアクセスできます。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。
現在のページは「霧島市 RunWithトップページ」です。左メニューおよびこのページのカード一覧から各機能に移動できます。
4グループの構成を説明してください：
- ⚡ 必須機能: WBダッシュボード・住民LINE相談・住民タッチポイント（毎日使う基本機能）
- 🤖 基本AI: KPI総合・WellBeing・経営ダッシュボード・施策PDCA・週次サマリー（データ分析）
- 🎯 課題特化型AI: 道路修復・ごみ管理・財政健全化・インフラ老朽化・住民コーチ（特定課題）
- 📚 研修・学習: ナレッジ活用・WBクエスト・カードゲーム（学習・研修）
どの機能から始めればよいか相談に乗ります。回答は400字以内。`,
    suggestions: ['どの機能から始めればいい？', '住民LINE相談の使い方は？', 'KPIとWBダッシュボードの違いは？', '研修ゲームの概要を教えて'],
  },
  '/kirishima/kpi': {
    pageTitle: '霧島市 KPI総合ダッシュボード',
    description: '9KPI（E軸：市民視点、T軸：提供者視点、L軸：責任者視点）の達成状況を一覧表示します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「KPI総合ダッシュボード」です。
9KPI体系の見方を説明してください：
- E軸（市民視点）: E1市民満足度、E2窓口待ち時間、E3オンライン完結率
- T軸（提供者視点）: T1電話一次解決率、T2新人OJT期間、T3ナレッジ活用率
- L軸（責任者視点）: L1DX施策ROI、L2研修完了率、L3職員WBスコア
KPIの読み方・達成状況の判断・データ更新方法を中心に回答してください。400字以内。`,
    suggestions: ['9KPIの見方を教えて', 'E軸・T軸・L軸の違いは？', '赤くなっているKPIへの対処は？', 'KPIデータを更新するには？'],
  },
  '/kirishima/touchpoints': {
    pageTitle: '霧島市 市民接触・満足度分析',
    description: '市民が霧島市と接触した記録と満足度をSDL五軸で分析します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「市民接触・満足度分析」です。
このページでは、市民タッチポイントデータをSDL五軸（共創・文脈・資源・統合・価値）で分析します。
グラフの見方・チャネル別集計・SDL分析の活用方法について説明してください。回答は400字以内。`,
    suggestions: ['SDL五軸スコアの見方は？', '満足度が低いチャネルへの対応は？', 'タッチポイントを追加するには？', '時系列トレンドはどう見る？'],
  },
  '/kirishima/wellbeing': {
    pageTitle: '霧島市 チームWellBeing',
    description: '職員のWell-Beingスコア（体調・業務負荷・手応え）を一覧表示し、チーム全体の状態を把握します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「チームWellBeing」です。
このページでは、職員のWBスコア・体調・業務負荷・手応えをNotionから取得して表示します。
スコアの見方・コンディション入力方法・スコアが低い職員への対応について説明してください。回答は400字以内。`,
    suggestions: ['WBスコアの見方は？', 'コンディションを入力するには？', 'スコアが低い職員への対応は？', 'チーム全体の傾向は？'],
  },
  '/kirishima/knowledge': {
    pageTitle: '霧島市 ナレッジ活用状況',
    description: '蓄積されたナレッジ記事の活用状況・有効性スコア・SDL軸分類を表示します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「ナレッジ活用状況」です。
このページでは、Notionのナレッジベース（手順書・FAQ・事例集）の活用状況を可視化します。
有効性スコアの見方・ナレッジ記事の追加・SDL分類の活用について説明してください。回答は400字以内。`,
    suggestions: ['有効性スコアの見方は？', 'ナレッジを追加するには？', '活用されていない記事はどれ？', 'SDL軸での分類は？'],
  },
  '/kirishima/roads': {
    pageTitle: '霧島市 道路修復AI分析',
    description: '道路の老朽化・損傷状況をAIが分析し、修繕優先度と費用対効果を算出します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「道路修復AI分析」です。
このページでは、道路施設データからAIが修繕優先度・費用対効果・修繕計画案を提案します。
優先度リストの見方・AIの提言の活用・道路データの更新方法について説明してください。回答は400字以内。`,
    suggestions: ['優先度リストの見方は？', 'AIの提言をどう使う？', '道路データを追加するには？', '費用見積もりの見方は？'],
  },
  '/kirishima/waste': {
    pageTitle: '霧島市 ごみ管理最適化',
    description: '収集ルート・施設・地区別排出量データをAIが分析し、収集効率の改善案を提案します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「ごみ管理最適化」です。
このページでは、ごみ収集ルート・施設稼働状況・地区別排出量をAIが分析して最適化案を提案します。
分析結果の見方・改善提案の活用・データ管理について説明してください。回答は400字以内。`,
    suggestions: ['改善提案の見方は？', 'ルートデータを更新するには？', '排出量が多い地区への対応は？', '施設稼働率の見方は？'],
  },
  '/kirishima/pdca-tracking': {
    pageTitle: '霧島市 施策PDCAトラッキング',
    description: '実施中の施策のPDCA進捗をAIが分析し、次のアクションを提案します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「施策PDCAトラッキング」です。
このページでは、施策の実施状況・効果測定・AIによる次アクション提案を管理します。
PDCAの見方・施策データの更新・AIの提言活用について説明してください。回答は400字以内。`,
    suggestions: ['PDCAの見方を教えて', '施策の進捗を更新するには？', 'AIの次アクション提案は？', '効果測定の方法は？'],
  },
  '/kirishima/resident-coach': {
    pageTitle: '霧島市 住民個人AIコーチ',
    description: '住民の相談内容・WBスコアをもとにAIがパーソナルな改善アドバイスを提供します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「住民個人AIコーチ」です。
このページでは、住民の相談履歴・WBスコアをもとにAIが個人に合ったアドバイスを生成します。
住民データの検索・コーチング結果の見方・職員との情報共有について説明してください。回答は400字以内。`,
    suggestions: ['住民を検索するには？', 'コーチング結果の見方は？', '職員との情報共有は？', 'データを更新するには？'],
  },
  '/kirishima/management-dashboard': {
    pageTitle: '霧島市 経営ダッシュボード',
    description: '財政・住民WB・職員コンディション・施策進捗を経営視点で統合表示します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「経営ダッシュボード」です。
このページでは、霧島市の経営状態を財政・住民Well-Being・職員コンディション・施策PDCAの4軸で統合的に把握できます。
- 財政セクション: 歳入・歳出・財政健全化指標の要約
- 住民WBセクション: 市民満足度・相談件数・Well-Beingスコアの要約
- 職員セクション: 平均WBスコア・体調・業務負荷の要約
- 施策PDCAセクション: 実施中施策の進捗状況
各セクションの見方・異常値への対処・詳細ページへの移動方法について説明してください。回答は400字以内。`,
    suggestions: ['経営ダッシュボードの4軸とは？', '数値が悪いときの対処は？', '詳細データはどこで確認？', 'AIの提言をどう活用する？'],
  },
  '/kirishima/fiscal-health': {
    pageTitle: '霧島市 財政健全化AI分析',
    description: '財政指標（歳入・歳出・財政力指数等）をAIが分析し、コスト削減・収入増加の提言を生成します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「財政健全化AI分析」です。
このページでは、Notionの財政健全化指標DBからデータを取得し、AIが分析・提言を生成します。
- 財政健全化指標: 財政力指数・実質公債費比率・経常収支比率・将来負担比率
- AI提言: 優先度（高・中・低）・タイトル・詳細・実施時期・コスト効果の5項目
「分析を実行」ボタンを押すとAIが最新データを取得して提言を生成します。
指標の見方・提言の活用方法・データの更新手順について説明してください。回答は400字以内。`,
    suggestions: ['財政力指数とは何ですか？', 'AI提言の優先度はどう決まる？', '分析を実行する手順は？', 'データを更新するには？'],
  },
  '/kirishima/infra-aging': {
    pageTitle: '霧島市 インフラ老朽化AI分析',
    description: '公共施設・インフラの老朽化リスクをAIが評価し、更新・修繕の優先順位と費用計画を提案します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「インフラ老朽化AI分析」です。
このページでは、公共施設・道路・橋梁などのインフラ老朽化状況をAIが分析します。
- 施設リスト: 各施設の築年数・老朽化スコア・優先度（緊急・高・中・低）
- AI提言: 修繕・更新の優先順位・予算配分・実施計画
「AI分析を実行」ボタンで最新の施設データをもとに分析を開始します。
老朽化スコアの見方・修繕優先順位の決め方・予算計画の立て方について説明してください。回答は400字以内。`,
    suggestions: ['老朽化スコアの見方は？', '優先度の決め方を教えて', '修繕予算の計画はどうする？', 'データを追加するには？'],
  },
  '/kirishima/line-consultation': {
    pageTitle: '霧島市 住民LINE相談管理',
    description: '霧島市の住民からLINEで届いた相談を一覧確認し、対応状況・回答内容をNotionに記録します。',
    systemPrompt: `あなたはRunWith Platform（霧島市専用）の操作サポートAIです。現在のページは「住民LINE相談管理」です。
このページでは、霧島市の住民からLINEで届いた相談を職員が確認・対応するための管理画面です。
- フィルタータブで「未対応」「対応中」「完了」「エスカレーション」に絞り込めます
- 各カードの「対応」ボタンを押すと、対応状況・担当職員・回答内容を編集できます
- 変更後「Notionに保存」ボタンを押すとNotion上のレコードが更新されます
操作方法・対応フロー・エスカレーションの基準について説明してください。回答は400字以内。`,
    suggestions: ['未対応の相談を確認するには？', '対応状況を変更するには？', 'エスカレーションの基準は？', '回答内容を保存するには？'],
  },

  // ── 屋久島 ───────────────────────────────────────────
  '/yakushima': {
    pageTitle: '屋久島町 RunWith トップ',
    description: '屋久島町専用のRunWithダッシュボードへようこそ。観光・移住・住民コーチング・施策PDCAを一元管理できます。',
    systemPrompt: `あなたはRunWith Platform（屋久島町専用）の操作サポートAIです。
現在のページは「屋久島町 RunWithトップページ」です。左メニューの各機能（観光・移住・施策PDCA等）へのナビゲーションページです。
各機能の概要・使い方・始め方を中心に案内してください。回答は400字以内。`,
    suggestions: ['観光管理はどこで見る？', '移住支援機能の使い方は？', 'PDCAの進め方を教えて', 'データを最新にするには？'],
  },
  '/yakushima/tourism': {
    pageTitle: '屋久島町 観光・エコツーリズム管理',
    description: '観光客数・満足度・エコツアー参加状況をAIが分析し、観光振興施策を提案します。',
    systemPrompt: `あなたはRunWith Platform（屋久島町専用）の操作サポートAIです。現在のページは「観光・エコツーリズム管理」です。
このページでは、観光データ（入込客数・ツアー参加率・満足度）をAIが分析して振興施策を提案します。
データの見方・AIの提言活用・観光データの更新について説明してください。回答は400字以内。`,
    suggestions: ['観光客数の見方は？', 'AIの振興提言の使い方は？', 'エコツアーデータを追加するには？', '季節別トレンドは？'],
  },
  '/yakushima/migration': {
    pageTitle: '屋久島町 移住・定住支援',
    description: '移住相談者のデータをAIが分析し、定着を高める個別支援施策と地域全体のマッチング戦略を提案します。',
    systemPrompt: `あなたはRunWith Platform（屋久島町専用）の操作サポートAIです。現在のページは「移住・定住支援」です。
このページでは、移住相談データからAIが定着率向上のための施策とマッチング戦略を提案します。
相談データの見方・AIの施策提案の活用・データ管理について説明してください。回答は400字以内。`,
    suggestions: ['移住相談データの見方は？', '定着率を高めるには？', 'AIの提案施策の使い方は？', '相談者データを追加するには？'],
  },
  '/yakushima/resident-coach': {
    pageTitle: '屋久島町 住民個人AIコーチ',
    description: '住民の相談内容・WBスコアをもとにAIがパーソナルな改善アドバイスを提供します。',
    systemPrompt: `あなたはRunWith Platform（屋久島町専用）の操作サポートAIです。現在のページは「住民個人AIコーチ」です。
このページでは、住民の相談履歴・WBスコアをもとにAIが個人に合ったアドバイスを生成します。
住民データの検索・コーチング結果の見方・活用方法について説明してください。回答は400字以内。`,
    suggestions: ['住民を検索するには？', 'コーチング結果の見方は？', 'データを更新するには？', '職員との連携は？'],
  },
  '/yakushima/pdca-tracking': {
    pageTitle: '屋久島町 施策PDCAトラッキング',
    description: '屋久島町の施策のPDCA進捗をAIが管理・分析し、次のアクションを提案します。',
    systemPrompt: `あなたはRunWith Platform（屋久島町専用）の操作サポートAIです。現在のページは「施策PDCAトラッキング」です。
このページでは、施策の実施状況・効果測定・AIによる次アクション提案を管理します。
PDCAの見方・データ更新・AIの提言活用について説明してください。回答は400字以内。`,
    suggestions: ['PDCAの見方を教えて', '施策を追加するには？', 'AIの次アクション提案は？', '効果測定はどうする？'],
  },
  '/yakushima/policy-engine': {
    pageTitle: '屋久島町 データ参照型施策提案',
    description: '屋久島町の実データ（観光・移住・住民WB）をAIが参照し、根拠ある施策案を提案します。',
    systemPrompt: `あなたはRunWith Platform（屋久島町専用）の操作サポートAIです。現在のページは「データ参照型施策提案」です。
このページでは、屋久島町の各種実データをもとにAIが施策案を提案します。
施策提案の生成手順・出力の読み方・Notionへの保存方法について説明してください。回答は400字以内。`,
    suggestions: ['施策提案の生成手順は？', 'どのデータを参照している？', '提案施策をどう採用する？', '結果をNotionに保存するには？'],
  },

  // ── 運用管理 ─────────────────────────────────────────
  '/runwith/maturity': {
    pageTitle: 'IT運用成熟度診断',
    description: '組織のIT運用成熟度を5段階でスコアリングします。各領域の現状把握と改善計画策定に活用してください。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「IT運用成熟度診断」です。
このページでは、インシデント管理・変更管理・ナレッジ管理などの領域を5段階で評価します。
診断の進め方・スコアの見方・改善計画への活用について説明してください。回答は400字以内。`,
    suggestions: ['診断の進め方を教えて', 'スコアの意味は？', '改善優先順位はどう決める？', '次のレベルに上がるには？'],
  },
  '/runwith/monitoring': {
    pageTitle: 'サービス監視',
    description: 'IT基盤・各サービスの稼働状況・エラー率・レスポンス時間をリアルタイムで監視します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「サービス監視」です。
このページでは、各ITサービスの稼働状況・エラー率・レスポンス時間をリアルタイムで表示します。
監視画面の見方・アラート対応・障害時の手順について説明してください。回答は400字以内。`,
    suggestions: ['監視画面の見方は？', 'アラートが出たときの対応は？', '過去の障害を振り返るには？', 'しきい値の設定を変えるには？'],
  },
  '/runwith/cmdb': {
    pageTitle: '構成管理（CMDB）',
    description: 'IT機器・サービス・依存関係を一元管理します。変更・障害時の影響範囲の特定に活用してください。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「構成管理（CMDB）」です。
このページでは、IT構成アイテム（CI）とその依存関係を管理します。
CIの登録・更新・影響範囲の調べ方について説明してください。回答は400字以内。`,
    suggestions: ['CMDBとは何ですか？', 'CIを追加するには？', '影響範囲を調べるには？', '変更前の確認手順は？'],
  },
  '/runwith/knowledge': {
    pageTitle: '集合知ナレッジブラウザ',
    description: '蓄積されたナレッジ記事を検索・閲覧できます。業務マニュアル・対応事例・FAQを効率よく活用できます。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「集合知ナレッジブラウザ」です。
このページでは、Notionのナレッジベースを検索・閲覧できます。
検索方法・記事の追加・カテゴリでの絞り込み方法について説明してください。回答は400字以内。`,
    suggestions: ['キーワード検索の方法は？', '記事を追加するには？', 'カテゴリで絞り込むには？', 'Notionと同期するには？'],
  },
  '/runwith/multi-tenant': {
    pageTitle: '横展開設定',
    description: '複数の自治体・組織へRunWith Platformを展開するためのマルチテナント設定を管理します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「横展開設定」です。
このページでは、新しい自治体・組織のテナント設定（DB ID・カラー・ステータス）を管理します。
設定の確認・変更方法・新テナント追加の手順について説明してください。回答は400字以内。`,
    suggestions: ['テナントを追加するには？', '設定を変更するには？', 'ステータスの意味は？', 'Notion DB IDはどこで確認？'],
  },
  '/runwith/org-wizard': {
    pageTitle: '組織設計ウィザード',
    description: '新しい自治体をRunWith Platformに追加するためのウィザードです。Notionページ作成・DB設定・テストデータ投入を自動化します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「組織設計ウィザード」です。
このウィザードでは、新しい自治体のNotionページ作成・データベース設定・テストデータ投入を順に行います。
各ステップの操作方法・エラー時の対処・完了後の確認事項について説明してください。回答は400字以内。`,
    suggestions: ['ウィザードの手順を教えて', 'エラーが出たときは？', '完了後にすることは？', 'NotionのAPIキーはどこで設定？'],
  },
  '/runwith/mcp-gateway': {
    pageTitle: 'MCPゲートウェイ ログ',
    description: 'MCP（Model Context Protocol）経由のAPI呼び出しログを確認できます。Notion連携・AI呼び出しのデバッグに。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「MCPゲートウェイ ログ」です。
このページでは、NotionやClaudeへのAPI呼び出し履歴をログとして確認できます。
ログの読み方・エラーの対処方法・ログを使ったデバッグ手順について説明してください。回答は400字以内。`,
    suggestions: ['ログの見方を教えて', 'エラーログが出たときは？', 'Notion接続のトラブルシュートは？', 'ログのフィルター方法は？'],
  },

  // ── 研修・学習（カードゲーム） ────────────────────────
  '/card-game': {
    pageTitle: '研修・学習 カードゲーム一覧',
    description: 'RunWith Platformの体験型研修ゲームが揃っています。プレイしたいゲームを選んでスタートボタンを押してください。結果はAI評価で採点されます。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「研修・学習 カードゲーム一覧」です。
このページでは、4つの体験型研修ゲームを選んでプレイできます：
① PBL カードゲーム（Mission in LOGI-TECH）: チームワーク・Make or Buy・ITIL/SIAMを学ぶ
② Well-Being QUEST: 限界自治体の持続可能な街づくりを体験するシリアスゲーム
③ 八百屋アジャイル道場: アジャイルの5要素を八百屋経営で体験
④ 行政DXチャレンジ: 新人IT職員として5つのDX課題に挑戦
各ゲームの特徴・対象者・プレイ方法について、わかりやすく説明してください。回答は400字以内。`,
    suggestions: ['どのゲームから始めればいい？', 'PBLカードゲームとは何ですか？', 'ゲームの結果はどうなる？', '研修での活用方法は？'],
  },
  '/card-game/select': {
    pageTitle: 'Mission in LOGI-TECH — カード選択',
    description: '4種類のカード（ミッション・ペルソナ・パートナー・ソリューション）を選んでビジネスプランを完成させます。選んだカードの組み合わせでAIが3年間の利益を計算します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Mission in LOGI-TECH — カード選択」です。
このゲームでは4種類のカードを順番に選択します：
- ♦️ ミッションカード（1枚固定）: 解決する経営課題を選ぶ
- ♥️ ペルソナカード（複数選択可）: ターゲット顧客を選ぶ
- ♣️ パートナーカード（複数選択可）: 外部委託するパートナーを選ぶ（Buy）
- ♠️ ソリューションカード（複数選択可）: 自社で開発するソリューションを選ぶ（Make）
選択後、AIが3年間の累計利益・事業成功率を計算してS〜Dランクで評価します。
カードの選び方・Make or Buyの考え方・高ランクを取るコツについて説明してください。回答は400字以内。`,
    suggestions: ['カードはどの順番で選ぶ？', 'Make と Buy の違いは？', '高ランクを取るコツは？', 'カードの組み合わせのポイントは？'],
  },
  '/card-game/result': {
    pageTitle: 'Mission in LOGI-TECH — 結果',
    description: '選んだカードの組み合わせでAIが3年間累計利益・事業成功率・ランク（S〜D）を計算・評価します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Mission in LOGI-TECH — 結果」です。
このページでは、選んだカードの組み合わせから以下を計算・表示しています：
- 3年間累計利益（万円）
- 事業成功率（%）
- ランク：S（2億円以上）/ A（1億円以上）/ B（5000万円以上）/ C（黒字）/ D（赤字）
- AIによるビジネスプラン評価コメント
ランクの意味・スコアの改善方法・AIの評価コメントの読み方について説明してください。回答は400字以内。`,
    suggestions: ['ランクの意味を教えて', 'スコアをもっと上げるには？', 'AIの評価コメントの見方は？', 'もう一度プレイするには？'],
  },
  '/card-game/plan': {
    pageTitle: 'Mission in LOGI-TECH — 計画確認',
    description: '選んだカードの組み合わせを最終確認するページです。内容を確認してから結果計算に進みます。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Mission in LOGI-TECH — 計画確認」です。
このページでは、選んだカード（ミッション・ペルソナ・パートナー・ソリューション）の最終確認ができます。
カードの組み合わせの見直し方・変更手順・計算に進む方法について説明してください。回答は400字以内。`,
    suggestions: ['カードを変更するには？', '計算に進むには？', '選んだカードの確認方法は？', '最初からやり直すには？'],
  },
  '/card-game/agile-yasai': {
    pageTitle: '八百屋アジャイル道場',
    description: '八百屋経営のシナリオを通じてアジャイルの5要素（顧客重視・反復・透明性・適応・協働）を体験する研修ゲームです。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「八百屋アジャイル道場」です。
このゲームでは、八百屋の経営場面を通じてアジャイルの5要素を体験します：
① 顧客重視: お客様のニーズを最優先にする
② 反復: 小さく試して素早く改善する
③ 透明性: チームで情報を共有する
④ 適応: 状況の変化に柔軟に対応する
⑤ 協働: チームで助け合って進める
各シナリオで3択の選択肢から「最もアジャイル的な答え」を選ぶゲームです。
ゲームの進め方・アジャイル原則の解説・各シナリオの考え方について説明してください。回答は400字以内。`,
    suggestions: ['アジャイルとは何ですか？', 'ゲームの進め方を教えて', '正解の選び方のコツは？', '業務にどう活かす？'],
  },
  '/card-game/gyosei-dx': {
    pageTitle: '行政DXチャレンジ',
    description: '新人IT職員として5つのDX課題（窓口DX・データ活用・業務効率化・AI導入・住民サービス改革）に取り組む行政DX体験ゲームです。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「行政DXチャレンジ」です。
このゲームでは、新人IT職員として5つのステージをクリアします：
① 窓口DX: 窓口業務のデジタル化方法を選ぶ
② データ活用: 住民データの分析・活用方法を選ぶ
③ 業務効率化: AI・RPAを活用した業務改善方法を選ぶ
④ AI導入: 行政AIサービスの導入手順を選ぶ
⑤ 住民サービス改革: 住民満足度向上の施策を選ぶ
各ステージで3択から最善策を選び、スコアを積み上げます。
ゲームの進め方・DXの考え方・高スコアのコツについて説明してください。回答は400字以内。`,
    suggestions: ['ゲームの進め方を教えて', 'DXとは何ですか？', '高スコアを取るコツは？', '行政DXの実例は？'],
  },

  // ── Well-Being QUEST ─────────────────────────────────
  '/well-being-quest': {
    pageTitle: 'Well-Being QUEST — トップ',
    description: '人口1万人・高齢化率50%の限界自治体として、持続可能な街づくりを体験するシリアスゲームです。カードを選んでMake or Buy戦略を組み立てます。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Well-Being QUEST」です。
このゲームでは、人口1万人・高齢化率50%の限界自治体の職員として、持続可能な街づくりを体験します。
ゲームの流れ：
① 課題カードを選ぶ（住民が抱える課題）
② ペルソナカードを選ぶ（支援対象の住民グループ）
③ パートナーカードを選ぶ（民間委託するサービス ＝ Buy）
④ 自治体で直接担う業務が決まる（直営 ＝ Make）
結果として財政収支・住民満足度・自治体ランクが評価されます。
ゲームの始め方・Make or Buy戦略の考え方・高評価を得るコツについて説明してください。回答は400字以内。`,
    suggestions: ['ゲームの始め方は？', 'Make と Buy の違いは？', '高評価を得るコツは？', '限界自治体とはどんな状況？'],
  },
  '/well-being-quest/select': {
    pageTitle: 'Well-Being QUEST — カード選択',
    description: '課題・ペルソナ・パートナー・アクションの4ステップでカードを選びます。どんな住民を支援し、何を外部委託するかを決める戦略ゲームです。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Well-Being QUEST — カード選択」です。
このページでは4ステップでカードを選択します：
- STEP 0（♦️課題）: 解決する住民課題を1枚選ぶ（難しい課題ほど高評価）
- STEP 1（♥️ペルソナ）: 支援する住民グループを選ぶ
- STEP 2（♣️パートナー）: 民間に委託するサービスを選ぶ（Buy戦略）
- STEP 3（♠️アクション）: 自治体が直接担う業務が自動決定（Make戦略）
カードの選び方・各ステップの考え方・高評価につながる戦略について説明してください。回答は400字以内。`,
    suggestions: ['カードはどう選べばいい？', 'パートナー選びのポイントは？', '難しい課題を選ぶとどうなる？', '財政を黒字にするには？'],
  },
  '/well-being-quest/plan': {
    pageTitle: 'Well-Being QUEST — 計画確認',
    description: '選んだカードの内容を確認するページです。住民課題・支援対象・委託先・直営業務の組み合わせを確認してから結果計算に進みます。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Well-Being QUEST — 計画確認」です。
このページでは、選んだカードの組み合わせ（課題・ペルソナ・パートナー・アクション）を確認します。
確認内容の見方・変更手順・計算に進む方法について説明してください。回答は400字以内。`,
    suggestions: ['カードを変更するには？', '計算に進むには？', 'この組み合わせの評価は？', '最初からやり直すには？'],
  },
  '/well-being-quest/result': {
    pageTitle: 'Well-Being QUEST — 結果',
    description: '選んだカードの組み合わせで財政収支・住民満足度・自治体ランクが計算されます。AIが自治体経営の評価コメントを提供します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「Well-Being QUEST — 結果」です。
このページでは以下の評価結果が表示されます：
- 財政収支（黒字 or 赤字）
- 住民満足度スコア
- 自治体ランク（S/A/B/C/D）
- AIによる自治体経営評価コメント
ランクの意味・スコアの改善方法・評価コメントの活用・もう一度試す方法について説明してください。回答は400字以内。`,
    suggestions: ['ランクの意味を教えて', 'スコアをもっと上げるには？', 'AIの評価コメントの見方は？', 'もう一度プレイするには？'],
  },

  // ── 設定 ─────────────────────────────────────────────
  '/gyosei/settings': {
    pageTitle: '自治体プロフィール設定',
    description: '自治体の基本情報（名称・人口・担当部署・NotionページID等）を設定・確認できます。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「自治体プロフィール設定」です。
このページでは、選択中の自治体の基本情報・Notion連携設定・担当部署情報を管理します。
設定項目の意味・変更方法・保存手順・よくあるエラーの対処について説明してください。回答は400字以内。`,
    suggestions: ['NotionページIDはどこで確認？', '設定を保存するには？', '自治体を追加するには？', 'API接続エラーの対処は？'],
  },
  '/settings': {
    pageTitle: 'プラットフォーム設定',
    description: 'RunWith Platformの全体設定（API・認証・通知等）を管理します。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「プラットフォーム設定」です。
このページでは、プラットフォーム全体のAPI接続・認証・通知設定を管理します。
設定項目の意味・変更手順・よくあるトラブルの対処について説明してください。回答は400字以内。`,
    suggestions: ['APIキーの設定方法は？', '通知設定を変えるには？', '認証エラーの対処は？', '設定を初期化するには？'],
  },

  // ── Sprint #79: システムヘルス監視 ──────────────────
  '/admin/system-health': {
    pageTitle: 'システムヘルス監視',
    description: 'Notion・Vercel・LINE の死活状態をリアルタイムで確認するページです。',
    systemPrompt: `あなたはRunWith Platformの操作サポートAIです。現在のページは「システムヘルス監視」です。
このページでは Notion・Vercel・LINE などの外部サービスの死活状態を確認できます。
- 「今すぐ確認」ボタンで手動ヘルスチェックを実行します
- Vercel Cron が5分ごとに自動チェックを実行しています
- 障害検知時は管理者の LINE に自動通知が届きます
- ADMIN_LINE_USER_ID が未設定の場合は通知されません（Vercel 環境変数で設定）
BCP 方針や環境変数の設定方法について質問してください。回答は400字以内。`,
    suggestions: ['Notion が止まったとき業務はどうなる？', 'ADMIN_LINE_USER_ID の設定方法は？', 'ステータスの見方を教えて', 'Cronは何分ごとに動いている？'],
  },
};

// パスが一致しない場合のデフォルトコンテキスト
const DEFAULT_CONTEXT: PageContext = {
  pageTitle: 'RunWith Platform',
  description: 'このページの使い方・操作方法・データの見方について質問できます。',
  systemPrompt: `あなたはRunWith Platformの操作サポートAIです。
ユーザーが現在開いているページの使い方・操作方法・データの見方について、自治体職員にわかりやすく説明してください。
専門用語を避け、400字以内で簡潔に答えてください。`,
  suggestions: ['このページの使い方は？', 'データはどこから来ていますか？', '結果の活用方法は？', 'エラーが出たときは？'],
};

// ─── Markdownレンダラー ──────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    result.push(
      <ul key={key++} className="list-disc list-inside my-1 space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList();
      result.push(
        <p key={key++} className="font-bold text-sm mt-3 mb-1 text-gray-900">
          {renderInline(line.slice(3))}
        </p>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      result.push(
        <p key={key++} className="font-semibold text-sm mt-2 mb-0.5 text-gray-800">
          {renderInline(line.slice(4))}
        </p>
      );
    } else if (line.match(/^[-*]\s/)) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
      result.push(<div key={key++} className="my-1" />);
    } else {
      flushList();
      result.push(
        <p key={key++} className="text-sm leading-relaxed">{renderInline(line)}</p>
      );
    }
  }
  flushList();
  return result;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// ─── メインコンポーネント ────────────────────────────────

export default function ChatPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 現在のパスを取得し、クエリパラメータを除去してコンテキストを選択
  const pathname = usePathname();
  const cleanPath = pathname.split('?')[0];

  // PAGE_CONTEXTS から完全一致で検索、なければデフォルト
  const ctx = PAGE_CONTEXTS[cleanPath] ?? DEFAULT_CONTEXT;

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          systemPrompt: ctx.systemPrompt,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'APIエラー');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? 'エラー: 応答がありませんでした' },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'エラーが発生しました';
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 h-screen bg-white border-l border-gray-200 flex flex-col">

      {/* ── ヘッダー ── */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-blue-600 flex-shrink-0" />
            {/* ■ 名称統一：全ページ「AIアシスタント」 */}
            <h2 className="font-semibold text-sm text-gray-800">AIアシスタント</h2>
          </div>
          {/* 現在のページ名を小さく表示（切り替わるのでユーザーが確認できる） */}
          <div className="text-xs mt-0.5 text-blue-600 truncate">
            📄 {ctx.pageTitle}
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-gray-200 p-2 rounded transition-colors flex-shrink-0 ml-2"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── メッセージ一覧 ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* 初期メッセージ（ページの説明） */}
        {messages.length === 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">📄 {ctx.pageTitle}</p>
            <p className="text-xs text-blue-700 leading-relaxed">{ctx.description}</p>
          </div>
        )}

        {/* チャット履歴 */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white text-sm leading-relaxed ml-8'
                : 'bg-gray-100 text-gray-800 mr-8'
            }`}
          >
            {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
          </div>
        ))}

        {/* ローディング表示 */}
        {loading && (
          <div className="bg-gray-100 text-gray-500 p-3 rounded-xl mr-8 text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            AIが考えています...
          </div>
        )}
      </div>

      {/* ── 入力欄 ── */}
      <div className="p-4 border-t border-gray-200">

        {/* サジェスト質問（初回のみ表示） */}
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {ctx.suggestions.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // IME変換中（日本語入力）は送信しない
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && !loading) {
                sendMessage();
              }
            }}
            placeholder="このページの使い方を質問する..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
