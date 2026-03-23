'use client';

// ============================================================
// 八百屋アジャイル道場 〜スムージー始めました〜
// 最上千佳子先生へのオマージュ カードゲーム
// アジャイルの5要素を八百屋経営で体験する学習ゲーム
// ============================================================

import { useState, useEffect } from 'react';

// ============================================================
// 型定義
// ============================================================

/** 選択肢の型 */
type Choice = {
  text: string;       // 選択肢のテキスト
  score: number;      // 獲得スコア
  feedback: string;   // 選択後のフィードバック
  isAgile: boolean;   // アジャイル的な正解かどうか
};

/** 問題カードの型 */
type QuestionCard = {
  id: string;               // 問題ID
  type: 'customer' | 'happening'; // お客さん or ハプニング
  character: string;        // 登場キャラクター名
  characterEmoji: string;   // キャラクター絵文字
  situation: string;        // 状況説明
  dialogue: string;         // セリフまたは出来事説明
  choices: Choice[];        // 3択の選択肢
  agileLesson: string;      // アジャイルの学び（最上先生の解説）
  agileKeyword: string;     // アジャイルキーワード
};

/** シナリオの型 */
type Scenario = {
  id: number;               // シナリオID
  season: string;           // 季節絵文字
  title: string;            // タイトル
  subtitle: string;         // サブタイトル
  theme: string;            // テーマ説明
  agileElement: string;     // 対応するアジャイル要素
  agileDescription: string; // アジャイル要素の説明
  color: string;            // テーマカラー（Tailwindクラス）
  bgColor: string;          // 背景カラー
  borderColor: string;      // ボーダーカラー
  textColor: string;        // テキストカラー
  questions: QuestionCard[]; // 問題カード一覧（5問）
  masterMessage: string;    // 最上先生の総括メッセージ
};

/** ゲーム状態の型 */
type GamePhase =
  | 'title'           // タイトル画面
  | 'scenario-select' // シナリオ選択画面
  | 'playing'         // プレイ中
  | 'result-popup'    // 結果ポップアップ
  | 'master-message'  // 最上先生のメッセージ
  | 'score';          // スコア画面

// ============================================================
// ゲームデータ定義
// ============================================================

/** 全5シナリオのデータ */
const SCENARIOS: Scenario[] = [
  // ----------------------------------------------------------
  // 第1話：春 〜まず1杯から始めろ〜 MVP
  // ----------------------------------------------------------
  {
    id: 1,
    season: '🌸',
    title: '第1話：まず1杯から始めろ',
    subtitle: 'スムージー、始めました',
    theme: '春・開店準備',
    agileElement: '小さく早くリリース（MVP）',
    agileDescription: '最小限の価値ある製品をまず作って届けること',
    color: 'sky',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    textColor: 'text-sky-700',
    masterMessage:
      '4月の八百屋さん、お疲れ様！1種類から始めたこと、大正解よ。アジャイルではこれを「MVP（Minimum Viable Product）」って言うの。完璧を目指して何もしないより、まず動かして反応を見る。それがアジャイルの第一歩よ！あなたはもうアジャイルの入口に立っているわ。',
    questions: [
      // 問1：お客さんカード
      {
        id: 's1-q1',
        type: 'customer',
        character: '常連・ハナさん',
        characterEmoji: '👵',
        situation: '朝9時、開店直後',
        dialogue:
          'スムージーって体にいいの？野菜ジュースと何が違うの？うちの孫が飲みたいって言うんだけど…',
        choices: [
          {
            text: 'まずトマトスムージー1種類だけ試作して飲んでもらう',
            score: 150,
            feedback:
              '正解！1種類から始めてハナさんの反応を見ることができました。お孫さん用に甘さを調整するヒントも得られました！',
            isAgile: true,
          },
          {
            text: '完璧なメニュー表を作ってから1週間後に販売開始する',
            score: 30,
            feedback:
              'ハナさんは待てずにコンビニへ…。完璧を待つより、まず小さく始めた方が早く価値を届けられます。',
            isAgile: false,
          },
          {
            text: '野菜ジュースとスムージーの違いを30分かけて詳しく説明する',
            score: 50,
            feedback:
              'ハナさんは途中で「わかったわ、また今度ね」と帰ってしまいました。行動より説明が多すぎました。',
            isAgile: false,
          },
        ],
        agileLesson:
          '「まず1種類作って試してもらう」がMVPの考え方よ。完璧なものを時間かけて作るより、最小限でも価値あるものを早く届ける。お客さんの反応から学ぶことが大事なの！',
        agileKeyword: 'MVP（最小限の製品）',
      },
      // 問2：お客さんカード
      {
        id: 's1-q2',
        type: 'customer',
        character: '健康オタク・タカシさん',
        characterEmoji: '💼',
        situation: '昼12時、ランチタイム',
        dialogue:
          'カロリーは？食物繊維は何グラム？糖質は？ビタミンCの含有量は？プロテイン入れられますか？豆乳ベースにできますか？',
        choices: [
          {
            text: 'まず一番人気の緑スムージーを飲んでもらい、感想を聞く',
            score: 150,
            feedback:
              '正解！タカシさんは飲んでみて「意外と飲みやすい！」。全部の質問に答えるより、まず体験してもらうことが大切でした。',
            isAgile: true,
          },
          {
            text: '全ての質問に答えられるよう栄養成分表を1週間かけて作る',
            score: 20,
            feedback:
              'タカシさんは「遅い」と言って他の店へ。全部揃えてから始めようとすると、チャンスを逃します。',
            isAgile: false,
          },
          {
            text: '要望を全部叶えた完全カスタマイズスムージーをその場で開発する',
            score: 40,
            feedback:
              '材料が足りず失敗。要求を全部叶えようとすると何もできなくなります。優先順位が必要です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'タカシさんの質問攻めは「要求の多様性」の典型よ。全部に答えようとしなくていい。まず最も価値のあるものから小さく始めて、反応を見ながら少しずつ増やすのがアジャイルの知恵よ！',
        agileKeyword: 'インクリメンタル開発',
      },
      // 問3：お客さんカード
      {
        id: 's1-q3',
        type: 'customer',
        character: '頑固・スズキさん',
        characterEmoji: '🧓',
        situation: '午後3時、閑散タイム',
        dialogue:
          'スムージーなんぞ売るな！ここは八百屋じゃろが！野菜をそのまま売るのが筋というもんじゃ！（腕組み）',
        choices: [
          {
            text: '小さいサイズで100円の試飲版を作り、まず飲んでもらう',
            score: 150,
            feedback:
              '正解！スズキさんは渋々飲んで「…悪くないな」。小さく試してもらうことで変化への抵抗が和らぎました！',
            isAgile: true,
          },
          {
            text: 'スズキさんの意見を尊重してスムージー販売をやめる',
            score: 10,
            feedback:
              '変化への抵抗に負けてしまいました。アジャイルでは変化を歓迎することが大切です。',
            isAgile: false,
          },
          {
            text: 'アジャイルの理論を10分かけてスズキさんに説明する',
            score: 30,
            feedback:
              'スズキさんは「難しいことはわからん！」と怒って帰りました。理論より体験が大事です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'スズキさんの反応は「変化への抵抗」。どんな組織にもあるあるよ。でも小さく試してもらうことで、抵抗が和らぐことがある。MVPは人の心も動かすのよ！',
        agileKeyword: '変化への適応',
      },
      // 問4：ハプニングカード
      {
        id: 's1-q4',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '💥',
        situation: '月曜日の朝',
        dialogue:
          'ミキサーの蓋を閉め忘れた！ほうれん草スムージーが天井に直撃！！店中が緑色に…',
        choices: [
          {
            text: '笑って片付け、「今日の失敗メモ」に記録して次に活かす',
            score: 150,
            feedback:
              '正解！失敗を記録したことで「蓋チェックリスト」が生まれました。アジャイルは失敗から学ぶ文化です！',
            isAgile: true,
          },
          {
            text: 'もうスムージーはやめようと落ち込んでしまう',
            score: 10,
            feedback:
              '一度の失敗でやめてしまうのはもったいない。失敗はデータです！',
            isAgile: false,
          },
          {
            text: 'ミキサーを使うのをやめ、手動で混ぜる方法に変える',
            score: 50,
            feedback:
              '安全にはなりましたが効率が激減。根本原因（蓋チェック）を改善する方が良かったです。',
            isAgile: false,
          },
        ],
        agileLesson:
          'ミキサー爆発は痛かったけど、早い段階で起きてよかったわ。アジャイルでは「失敗は早いほど安い」の。小さく始めるから、失敗しても被害が少ない。そして記録して次に活かす。それが学習する組織よ！',
        agileKeyword: '早期フィードバック・学習',
      },
      // 問5：ハプニングカード
      {
        id: 's1-q5',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '🏪',
        situation: '水曜日、開店前',
        dialogue:
          '近所に大手コンビニが開店！100円スムージーを販売開始…。どうする？',
        choices: [
          {
            text: '「地元野菜100%・顔の見える安心感」で差別化してすぐ告知する',
            score: 150,
            feedback:
              '正解！ハナさんたちは「やっぱりここのが好き」と戻ってきました。素早く方向転換できました！',
            isAgile: true,
          },
          {
            text: '価格を同じ100円まで下げて対抗する',
            score: 40,
            feedback:
              '価格競争は体力勝負。大手には勝てません。価値で勝負することが大切です。',
            isAgile: false,
          },
          {
            text: '半年かけて新商品ラインナップを開発してから対抗する',
            score: 20,
            feedback:
              '半年後にはお客さんがコンビニに慣れてしまいました。環境変化には素早い対応が必要です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'コンビニ開店は環境変化の典型よ。アジャイルが大切にするのは「変化への対応」。計画に固執せず、素早く方向転換できる柔軟さが強さになるの。あなたは素早く動けたわ！',
        agileKeyword: '変化への対応力',
      },
    ],
  },

  // ----------------------------------------------------------
  // 第2話：夏 〜お客の声が宝物〜 顧客フィードバック
  // ----------------------------------------------------------
  {
    id: 2,
    season: '☀️',
    title: '第2話：お客の声が宝物',
    subtitle: 'フィードバック、集めました',
    theme: '夏・成長期',
    agileElement: '顧客フィードバック・改善',
    agileDescription: 'お客さんの声を聞いて素早く改善を繰り返すこと',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
    masterMessage:
      '夏の八百屋さん、声を聞き続けたわね！アジャイルではお客さんのフィードバックを「プロダクトバックログ」に積み上げて、価値の高いものから改善していくの。完璧な計画より、実際に使ってくれる人の声の方が100倍価値がある。あなたはそれを体で学んだわ！',
    questions: [
      {
        id: 's2-q1',
        type: 'customer',
        character: '子連れ・ユキさん',
        characterEmoji: '👩',
        situation: '土曜日の午前',
        dialogue:
          '先週飲んだら子どもが「もっと甘い！」って言うんです。でも私は甘さ控えめがいい。二人分作れますか？',
        choices: [
          {
            text: '甘さを選べる仕組みを翌週すぐに導入する',
            score: 150,
            feedback:
              '正解！ユキさん親子が「また来ます！」と大喜び。フィードバックを素早く反映できました！',
            isAgile: true,
          },
          {
            text: '「お子様向けメニュー開発プロジェクト」を立ち上げて3ヶ月後に対応する',
            score: 20,
            feedback:
              'ユキさんは3ヶ月待てず他の店へ。フィードバックは速く返すほど価値があります。',
            isAgile: false,
          },
          {
            text: '「申し訳ありませんが、レシピは変えられません」と断る',
            score: 10,
            feedback:
              'アジャイルの精神に反します。お客さんの声こそが改善の源泉です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'ユキさんの声は「フィードバック」よ。アジャイルではこれをすぐ次のスプリントに反映する。「聞いて・作って・届けて・また聞く」このサイクルが速いほど、お客さんに愛されるサービスになるの！',
        agileKeyword: 'フィードバックループ',
      },
      {
        id: 's2-q2',
        type: 'customer',
        character: '大学生グループ',
        characterEmoji: '📱',
        situation: '日曜日の午後',
        dialogue:
          'これインスタ映えする色にできませんか？紫とか…バタフライピーとか使えます？映えたら絶対拡散します！',
        choices: [
          {
            text: '翌日に紫スムージーを試作して大学生に写真を撮ってもらう',
            score: 150,
            feedback:
              '大成功！「#八百屋スムージー」がトレンド入り。予想外のフィードバックから新たな価値が生まれました！',
            isAgile: true,
          },
          {
            text: 'SNSは関係ないと思い断る',
            score: 10,
            feedback:
              '拡散のチャンスを逃しました。お客さんが価値を作ってくれることもあります。',
            isAgile: false,
          },
          {
            text: '映えるパッケージを外注業者に頼んで2ヶ月後に完成させる',
            score: 30,
            feedback:
              '2ヶ月後には大学生は別のトレンドに移っていました。スピードが大事でした。',
            isAgile: false,
          },
        ],
        agileLesson:
          '大学生の提案は想定外のフィードバックだったけど、素早く対応したことで大きな価値になったわ。アジャイルでは「顧客と協力して」価値を作る。お客さんはユーザーでありパートナーなの！',
        agileKeyword: '顧客との協働',
      },
      {
        id: 's2-q3',
        type: 'customer',
        character: '健康オタク・タカシさん',
        characterEmoji: '💼',
        situation: '月曜日、ランチタイム',
        dialogue:
          '先週より美味しくなった！何変えたの？あ、でもここのプロテイン入りがあったら毎日来るんだけど…',
        choices: [
          {
            text: 'プロテイン入りを翌日から試験的に提供してタカシさんに感想を聞く',
            score: 150,
            feedback:
              'タカシさんが毎日来るようになりました！小さく試して反応を見る、完璧なフィードバックループです。',
            isAgile: true,
          },
          {
            text: 'プロテインの仕入れルートを1ヶ月かけて徹底調査してから導入する',
            score: 40,
            feedback:
              'タカシさんは待ちきれず「もういい」と言いました。完璧より速さが大事なときがあります。',
            isAgile: false,
          },
          {
            text: 'タカシさん専用のカスタムメニューを作って特別料金にする',
            score: 60,
            feedback:
              '悪くはないですが、他のお客さんにも展開できる改善の機会を逃しました。',
            isAgile: false,
          },
        ],
        agileLesson:
          'タカシさんのリピートと新しい要望、これがスプリントレビューよ。「作って→見せて→フィードバックをもらって→改善する」この繰り返しがアジャイルの心臓。毎回少しずつ良くなっていくの！',
        agileKeyword: 'スプリントレビュー',
      },
      {
        id: 's2-q4',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '😤',
        situation: '火曜日',
        dialogue:
          '謎のクレーム発生！「甘くしてって言ったのに甘すぎる！」ユキさんからのLINE。先週の要望と真逆では…？',
        choices: [
          {
            text: '「どのくらいの甘さが理想ですか？」と具体的に確認してから改善する',
            score: 150,
            feedback:
              '正解！「蜂蜜小さじ1杯」という具体的な基準が生まれました。曖昧な要求を具体化することが大切です。',
            isAgile: true,
          },
          {
            text: '謝って元のレシピに戻す',
            score: 30,
            feedback:
              '問題を先送りにしてしまいました。根本原因（曖昧な要求）を解決する必要がありました。',
            isAgile: false,
          },
          {
            text: 'クレームが多いのでスムージーをやめる',
            score: 5,
            feedback:
              'やめてしまうのは早すぎます。クレームは改善のチャンスです！',
            isAgile: false,
          },
        ],
        agileLesson:
          '「甘くして」という要求が曖昧だったのよ。アジャイルでは要求を「受け入れ基準」として具体化する。「蜂蜜小さじ1杯」のような測定できる基準があると、作る側も確認できる。要求の明確化は開発の基本よ！',
        agileKeyword: '受け入れ基準・要求の明確化',
      },
      {
        id: 's2-q5',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '📦',
        situation: '金曜日',
        dialogue:
          '張り切ってトマト100個仕入れたら、1日で3個しか売れなかった…残り97個どうしよう。',
        choices: [
          {
            text: '次回から「少量仕入れ→反応確認→追加発注」のサイクルにする',
            score: 150,
            feedback:
              '正解！翌週から無駄が激減しました。小さく始めて確認するサイクルが大切です。',
            isAgile: true,
          },
          {
            text: '100個全部売るため無料配布キャンペーンを打つ',
            score: 50,
            feedback:
              '損失は最小化できましたが、根本的な仕入れ方法の改善ができませんでした。',
            isAgile: false,
          },
          {
            text: '次回は200個仕入れて売れるよう宣伝を強化する',
            score: 10,
            feedback:
              'なぜ売れなかったかを分析せずに量を増やすのは危険です。データを見ましょう。',
            isAgile: false,
          },
        ],
        agileLesson:
          'トマト100個は「ビッグバン開発」の失敗よ。アジャイルでは小さく始めて確認してから増やす。仕入れも開発も「計画しすぎず、試してから増やす」が鉄則。無駄が少なく、リスクも小さくなるわ！',
        agileKeyword: 'イテレーティブな計画',
      },
    ],
  },

  // ----------------------------------------------------------
  // 第3話：秋 〜何を先に売る？〜 価値の優先順位付け
  // ----------------------------------------------------------
  {
    id: 3,
    season: '🍂',
    title: '第3話：何を先に売る？',
    subtitle: 'バックログ、整理しました',
    theme: '秋・拡大期',
    agileElement: '価値の優先順位付け',
    agileDescription: '一番価値の高いものから順番に取り組むこと',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    masterMessage:
      '秋の八百屋さん、優先順位と戦ったわね！アジャイルではやることリスト「バックログ」を価値の高い順に並べて、上から順番に片付けていく。全部やろうとしない。「今一番大切なこと」に集中する。それがチームを迷わせない知恵よ！',
    questions: [
      {
        id: 's3-q1',
        type: 'customer',
        character: '健康オタク・タカシさん',
        characterEmoji: '💼',
        situation: '月曜日の朝',
        dialogue:
          '豆乳ベース版・ホット提供・糖質ゼロ版・プロテイン強化版・冷凍テイクアウト版を今週中に全部出してください！',
        choices: [
          {
            text: '一番要望が多い「豆乳ベース版」だけ今週作り、残りは来週以降に順番に対応する',
            score: 150,
            feedback:
              '正解！豆乳版が大ヒット。優先順位をつけて1つ1つ確実に進めることができました！',
            isAgile: true,
          },
          {
            text: '5つ全部を同時並行で今週中に開発する',
            score: 10,
            feedback:
              '全部中途半端になり、1つも完成しませんでした。同時並行は品質を下げます。',
            isAgile: false,
          },
          {
            text: '難しいので全部断る',
            score: 20,
            feedback:
              '全部断るのではなく、優先順位をつけて対応することが大切です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'タカシさんの5つの要望は「バックログ」よ。全部同時にやろうとすると何もできなくなる。一番価値の高いものから順番に、1つずつ確実に届ける。これがプロダクトバックログの優先順位付けよ！',
        agileKeyword: 'バックログの優先順位付け',
      },
      {
        id: 's3-q2',
        type: 'customer',
        character: '常連・ハナさん',
        characterEmoji: '👵',
        situation: '火曜日の朝',
        dialogue:
          '難しいことより、先週のトマトスムージーをまた飲みたいわ。あれが一番好きよ。毎日あれがあれば十分！',
        choices: [
          {
            text: 'ハナさんの「また欲しい」を最重要と判断し、人気メニューの安定供給を最優先にする',
            score: 150,
            feedback:
              '正解！常連客の安定した満足が一番の価値でした。シンプルだけど本質をついています。',
            isAgile: true,
          },
          {
            text: 'ハナさんの意見より新規顧客開拓を優先して新商品開発に集中する',
            score: 40,
            feedback:
              '既存の常連客を大切にしないと、土台が崩れます。価値の優先順位が逆でした。',
            isAgile: false,
          },
          {
            text: '「トマトスムージーはシンプルすぎる」と判断し、新バージョンに変える',
            score: 30,
            feedback:
              'お客さんが求めていないのに変えてしまいました。顧客の声を無視した改悪です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'ハナさんの一言は本質をついているわ。「顧客が本当に欲しいもの」が優先順位の基準。複雑な新機能より、シンプルで確実な価値の方が重要なことが多い。バックログの優先順位はお客さんが決めるのよ！',
        agileKeyword: '顧客価値の最大化',
      },
      {
        id: 's3-q3',
        type: 'customer',
        character: '栄養士・サトウさん',
        characterEmoji: '👩‍⚕️',
        situation: '水曜日の午後',
        dialogue:
          '一番売れているメニューはどれですか？データを見せてもらえますか？売れているものを増やした方がいいですよ。',
        choices: [
          {
            text: '売上データを確認し、上位3品の在庫を増やして下位商品の仕込みを減らす',
            score: 150,
            feedback:
              '正解！データに基づいた優先順位付けで、廃棄ゼロ・売上アップを同時に達成できました！',
            isAgile: true,
          },
          {
            text: '全メニューを均等に仕込み続ける',
            score: 30,
            feedback:
              '売れないものに資源を使い続けることは無駄です。データを活かしましょう。',
            isAgile: false,
          },
          {
            text: '売れていないメニューをもっと宣伝して売れるようにする',
            score: 50,
            feedback:
              '需要のないものを無理に売ろうとするより、需要のあるものを増やす方が効率的です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'サトウさんのアドバイスはデータドリブンな優先順位付けよ。アジャイルでは「何を作るか」をデータと顧客の声で決める。感覚や思い込みではなく、実績から優先順位を判断することが大切なの！',
        agileKeyword: 'データドリブンな意思決定',
      },
      {
        id: 's3-q4',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '😵',
        situation: '木曜日',
        dialogue:
          'メニューを一気に12種類追加した結果、仕込みが終わらず開店が3時間遅れた！お客さんが並んで待っている…',
        choices: [
          {
            text: '今日は3種類だけに絞って確実に提供し、残りは来週以降に段階的に追加する',
            score: 150,
            feedback:
              '正解！お客さんも「少なくても確実に買えた方がいい」と納得。段階的リリースが正解でした。',
            isAgile: true,
          },
          {
            text: '急いで全12種類を作り、品質が下がっても今日全部出す',
            score: 20,
            feedback:
              '品質の悪いものを出してしまいお客さんのクレームが増えました。',
            isAgile: false,
          },
          {
            text: '今日は閉店して明日完璧な状態で全12種類を出す',
            score: 30,
            feedback:
              '完璧を待つより、できるものから届ける方がお客さんは喜びます。',
            isAgile: false,
          },
        ],
        agileLesson:
          '12種類一気追加は「ビッグバンリリース」の失敗よ。アジャイルでは少しずつ確実に届ける「インクリメンタルリリース」が基本。全部揃ってから出すより、3種類でも今日届ける方が価値が高いことが多いの！',
        agileKeyword: 'インクリメンタルリリース',
      },
      {
        id: 's3-q5',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '🤔',
        situation: '金曜日の朝礼',
        dialogue:
          '「新商品開発」「既存メニュー改善」「SNS宣伝強化」「店内装飾リニューアル」「配達サービス開始」…全部やりたい。何から始める？',
        choices: [
          {
            text: '「お客さんに一番直接価値が届くもの」を基準に順番を決め、1位から着手する',
            score: 150,
            feedback:
              '正解！「既存メニュー改善」が1位になり、すぐ実行。お客さんの満足度が上がりました！',
            isAgile: true,
          },
          {
            text: '全部同時に少しずつ進める',
            score: 20,
            feedback:
              '全部中途半端になり、何も完成しませんでした。集中が大切です。',
            isAgile: false,
          },
          {
            text: '一番簡単なものから着手する',
            score: 40,
            feedback:
              '簡単さより価値の高さで優先順位を決めるべきでした。',
            isAgile: false,
          },
        ],
        agileLesson:
          'やりたいことが多すぎるときこそ優先順位が命よ。アジャイルでは「ビジネス価値」「リスク」「依存関係」を考慮して順番を決める。基準は常に「今一番お客さんに価値を届けられるものは何か」よ！',
        agileKeyword: '優先順位付けの基準',
      },
    ],
  },

  // ----------------------------------------------------------
  // 第4話：冬 〜みんなで決める店〜 チームの自己組織化
  // ----------------------------------------------------------
  {
    id: 4,
    season: '❄️',
    title: '第4話：みんなで決める店',
    subtitle: 'チーム、できました',
    theme: '冬・チームビルディング',
    agileElement: 'チームの自己組織化',
    agileDescription: '指示を待たずメンバーが自分で考えて動くチーム',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    masterMessage:
      '冬の八百屋さん、チームが動いたわね！自己組織化チームとは「誰かに言われなくても、各自が判断して動けるチーム」のこと。そのためには心理的安全性（失敗しても大丈夫という安心感）と、共通のゴールが必要よ。あなたのチームはその土台を作れたわ！',
    questions: [
      {
        id: 's4-q1',
        type: 'customer',
        character: '常連・ハナさん',
        characterEmoji: '👵',
        situation: '土曜日の朝',
        dialogue:
          '町内会の分、スムージー50杯お願い！来週の日曜日に！一人じゃ無理でしょ？誰か手伝う人いないの？',
        choices: [
          {
            text: 'バイトのケンタくんと近所のスズキさんに声をかけ、3人でチームを作って受ける',
            score: 150,
            feedback:
              '正解！3人で役割分担（仕入れ・製造・接客）が生まれ、50杯を無事に提供できました！',
            isAgile: true,
          },
          {
            text: '一人でできる量（10杯）に絞って受ける',
            score: 50,
            feedback:
              '安全ではありましたが、チームを作るチャンスを逃しました。',
            isAgile: false,
          },
          {
            text: '50杯全部一人で頑張って徹夜する',
            score: 20,
            feedback:
              '体を壊してしまいました。アジャイルでは持続可能なペースが大切です。',
            isAgile: false,
          },
        ],
        agileLesson:
          '50杯の注文はチームが必要なサインよ。アジャイルでは「クロスファンクショナルチーム」（多様なスキルを持つチーム）が基本。仕入れ・製造・接客を一人でやる必要はない。チームで動くことで初めてできることがある！',
        agileKeyword: 'クロスファンクショナルチーム',
      },
      {
        id: 's4-q2',
        type: 'customer',
        character: '頑固・スズキさん',
        characterEmoji: '🧓',
        situation: '火曜日の午後',
        dialogue:
          '…仕入れだけ手伝ったる。野菜の目利きはわしの方が上じゃ。スムージーは認めんが、良い野菜を仕入れることならできる（ぼそっと）',
        choices: [
          {
            text: 'スズキさんの強みを活かして「仕入れ担当」としてチームに迎える',
            score: 150,
            feedback:
              '正解！スズキさんの目利きで野菜の品質が上がり、スムージーの味も向上。強みを活かした役割分担の成功です！',
            isAgile: true,
          },
          {
            text: 'スムージーを認めていないので断る',
            score: 20,
            feedback:
              '強みを活かせるチャンスを逃しました。価値観が違っても、貢献できる部分はあります。',
            isAgile: false,
          },
          {
            text: 'スムージーも担当してもらおうと説得する',
            score: 40,
            feedback:
              '無理な説得より、得意なことで貢献してもらう方がチームは機能します。',
            isAgile: false,
          },
        ],
        agileLesson:
          'スズキさんの申し出は「自発的な役割取得」よ。アジャイルチームでは役割は上から割り当てるものではなく、各自が自分の強みを活かして自発的に取るもの。多様な強みが集まるとチームは強くなるの！',
        agileKeyword: '自発的な役割取得',
      },
      {
        id: 's4-q3',
        type: 'customer',
        character: 'バイト・ケンタくん',
        characterEmoji: '👨‍🎓',
        situation: '水曜日の朝礼',
        dialogue:
          'SNSの運用、僕に任せてください！インスタとTikTokやれば絶対お客さん増えます！自信あります！',
        choices: [
          {
            text: 'ケンタくんに任せて、週1回の結果報告だけもらう形で進めてもらう',
            score: 150,
            feedback:
              '正解！ケンタくんが自主的に動きフォロワー500人増。任せることで自己組織化が進みました！',
            isAgile: true,
          },
          {
            text: '全ての投稿を事前に確認してOKを出してから投稿させる',
            score: 40,
            feedback:
              'ケンタくんのモチベーションが下がり、投稿が週1回に減りました。マイクロマネジメントは逆効果です。',
            isAgile: false,
          },
          {
            text: 'SNSは自分でやるからケンタくんには別の仕事をさせる',
            score: 20,
            feedback:
              'ケンタくんの強みを活かせませんでした。得意な人に任せることが大切です。',
            isAgile: false,
          },
        ],
        agileLesson:
          'ケンタくんへの「任せる」決断が自己組織化の第一歩よ。アジャイルでは「何をするか」は決めても「どうやるか」はチームに任せる。信頼して任せることで、チームは自分で考えて動けるようになるの！',
        agileKeyword: '権限委譲・エンパワーメント',
      },
      {
        id: 's4-q4',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '🏠',
        situation: '木曜日',
        dialogue:
          '店長（あなた）が急に風邪でダウン！今日は来られない。チームだけで開店できるか…？',
        choices: [
          {
            text: '「3人でいつも通りやってみて、困ったらLINEして」と伝えて休む',
            score: 150,
            feedback:
              '大成功！チーム3人で売上は普段の90%を達成。自己組織化チームの真骨頂を発揮しました！',
            isAgile: true,
          },
          {
            text: '熱があっても無理して出勤する',
            score: 20,
            feedback:
              '体を壊してしまいました。チームを信頼することも大切なリーダーの仕事です。',
            isAgile: false,
          },
          {
            text: '「店長がいないから今日は臨時休業」と告知する',
            score: 10,
            feedback:
              'チームの可能性を信じられませんでした。自己組織化チームは店長なしでも動けます。',
            isAgile: false,
          },
        ],
        agileLesson:
          '店長なしで店が回った！それが自己組織化チームの証明よ。アジャイルが目指すのはリーダーに依存しないチーム。全員がゴールを理解して、自分で判断して動ける。これが一番強いチームの形なの！',
        agileKeyword: '自己組織化チーム',
      },
      {
        id: 's4-q5',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '🎊',
        situation: '大晦日前',
        dialogue:
          '年末の大行列！普段の5倍のお客さんが来た！チーム3人でテンパっている。どう対応する？',
        choices: [
          {
            text: '「それぞれ一番得意なことに集中して！スズキさん仕入れ、ケンタくんSNS告知、私は製造」と声をかける',
            score: 150,
            feedback:
              '大成功！役割分担が明確になり、チームが最大限のパフォーマンスを発揮しました！',
            isAgile: true,
          },
          {
            text: '全員で同じ作業（製造）をやって対応する',
            score: 40,
            feedback:
              '接客と仕入れが滞りました。多様な役割を活かすことが大切です。',
            isAgile: false,
          },
          {
            text: 'パニックになり「今日はもう無理！」と早めに閉店する',
            score: 10,
            feedback:
              'チームの力を活かせませんでした。役割分担で乗り越えられました。',
            isAgile: false,
          },
        ],
        agileLesson:
          'ピンチのときほどチームの真価が出るわ。それぞれの強みを活かした役割分担、これが自己組織化チームの力よ。誰かに言われなくても「自分は何をすべきか」を各自が判断して動けると、チームは嵐も乗り越えられる！',
        agileKeyword: 'チームの強みの最大化',
      },
    ],
  },

  // ----------------------------------------------------------
  // 第5話：大晦日 〜繰り返しが力になる〜 スプリント・イテレーション
  // ----------------------------------------------------------
  {
    id: 5,
    season: '🌟',
    title: '第5話：繰り返しが力になる',
    subtitle: '1年間、ありがとうございました',
    theme: '大晦日・集大成',
    agileElement: 'スプリント・イテレーション',
    agileDescription: '短いサイクルで繰り返し改善し続けること',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    masterMessage:
      '1年間、お疲れ様でした！春に1種類だったスムージーが、今や地域の名物よ。これがスプリントとイテレーションの力。完璧な計画はいらない。「作って→届けて→聞いて→直す」を繰り返すことで、気づいたら誰も真似できないものになっている。アジャイルの本質はここにあるわ！',
    questions: [
      {
        id: 's5-q1',
        type: 'customer',
        character: '常連・ハナさん',
        characterEmoji: '👵',
        situation: '大晦日の朝',
        dialogue:
          '1年間ありがとう！最初の頃と全然違うわね。どうやって良くなっていったの？秘訣を教えてちょうだい。',
        choices: [
          {
            text: '「毎週少しずつ直し続けたんです。ハナさんの声のおかげです」と伝える',
            score: 150,
            feedback:
              '正解！ハナさんは涙目で「また来年もよろしく」。継続的改善とお客様との協働が成功の秘訣でした。',
            isAgile: true,
          },
          {
            text: '「最初から完璧な計画がありました」と言う',
            score: 20,
            feedback:
              '実は週ごとの試行錯誤の積み重ねでした。計画より実行と改善が大事でした。',
            isAgile: false,
          },
          {
            text: '「特に何もしていません」と謙遜する',
            score: 30,
            feedback:
              '学びを伝える機会を逃しました。継続的改善の価値を伝えることも大切です。',
            isAgile: false,
          },
        ],
        agileLesson:
          '「毎週少しずつ」これがスプリントの本質よ。1週間という短いサイクルで「計画→実行→確認→改善」を繰り返す。1回1回は小さくても、52回繰り返すと大きな成長になる。イテレーションの力はここにあるの！',
        agileKeyword: 'スプリントサイクル',
      },
      {
        id: 's5-q2',
        type: 'customer',
        character: '健康オタク・タカシさん',
        characterEmoji: '💼',
        situation: '大晦日の昼',
        dialogue:
          '来年のメニュー、もう決まってる？春に向けて新しい野菜スムージーを計画して教えてほしいんだけど。',
        choices: [
          {
            text: '「来年の計画は大まかに。毎週お客さんの声を聞きながら一緒に作っていきます」と伝える',
            score: 150,
            feedback:
              '正解！タカシさんは「そのやり方いいですね！関わりたい」と言いました。柔軟な計画が共創を生みます。',
            isAgile: true,
          },
          {
            text: '来年の52週分の全メニューを今日決めて発表する',
            score: 20,
            feedback:
              '完璧な計画は変化に対応できません。アジャイルでは大まかな方向性だけ決めて、細部はその都度決めます。',
            isAgile: false,
          },
          {
            text: '「来年のことは来年考えます」と何も考えない',
            score: 30,
            feedback:
              '全く考えないのも問題。方向性は持ちながら、詳細は柔軟にするのがバランスです。',
            isAgile: false,
          },
        ],
        agileLesson:
          'アジャイルでは「適応型計画」が基本よ。ゴールや方向性は決めるけど、詳細な計画は直前のスプリントで決める。なぜなら未来は変わるから。「計画に従うより変化への対応」アジャイル宣言の言葉を思い出して！',
        agileKeyword: '適応型計画',
      },
      {
        id: 's5-q3',
        type: 'customer',
        character: '頑固・スズキさん',
        characterEmoji: '🧓',
        situation: '大晦日の午後',
        dialogue:
          'わしも来年からスムージーを始めようと思う。最初に何をすれば良い？（素直な顔で）',
        choices: [
          {
            text: '「1種類だけ作って1人に飲んでもらうことから始めてください」とアドバイスする',
            score: 150,
            feedback:
              '完璧なアドバイス！MVPからスタートして、フィードバックで改善する。アジャイルの第一歩を伝えられました！',
            isAgile: true,
          },
          {
            text: '完璧なスムージーバーを開業するための100ページの事業計画書を書くよう勧める',
            score: 10,
            feedback:
              'スズキさんは計画書を作っている間に諦めてしまいました。まず小さく始めることが大切です。',
            isAgile: false,
          },
          {
            text: '「全種類のメニューを揃えてから開業しましょう」とアドバイスする',
            score: 20,
            feedback:
              'スズキさんは準備に疲れてやめてしまいました。まずMVPから始めることをアドバイスすべきでした。',
            isAgile: false,
          },
        ],
        agileLesson:
          'スズキさんへのアドバイス、あなたは成長したわ！「1種類から・1人から」これがアジャイルの始め方。完璧を目指すより、まず動かす。動かして学んで、少しずつ良くする。この1年でそれを身をもって学んだのよ！',
        agileKeyword: 'アジャイルの始め方',
      },
      {
        id: 's5-q4',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '📔',
        situation: '大晦日の夜',
        dialogue:
          '1年間の振り返りノートが出てきた。春の自分のメモ：「スムージーって何？大丈夫かな…」今と全然違う！',
        choices: [
          {
            text: '振り返りノートを来年のチームと共有し、学びを次のサイクルに活かす',
            score: 150,
            feedback:
              '完璧です！「振り返り→共有→次に活かす」これがレトロスペクティブの本質。チーム全員の財産になります！',
            isAgile: true,
          },
          {
            text: '恥ずかしいから捨ててしまう',
            score: 10,
            feedback:
              '失敗や迷いの記録こそが宝物。アジャイルでは振り返りを大切にします。',
            isAgile: false,
          },
          {
            text: '自分一人で読んで終わりにする',
            score: 40,
            feedback:
              '個人の学びに留まってしまいました。チームで共有することで組織の知恵になります。',
            isAgile: false,
          },
        ],
        agileLesson:
          '振り返りノートはレトロスペクティブの記録よ。アジャイルでは毎スプリントの終わりに「良かったこと・改善すること」を振り返る。この積み重ねが組織の学習能力になる。1年分の学びはチームの宝物よ！',
        agileKeyword: 'レトロスペクティブ',
      },
      {
        id: 's5-q5',
        type: 'happening',
        character: 'ハプニング！',
        characterEmoji: '🎆',
        situation: '年越しの瞬間',
        dialogue:
          '来年の目標をどう決める？「完璧な計画を立てる」VS「小さく始めて調整する」、どちらで行く？',
        choices: [
          {
            text: '方向性（北極星）だけ決めて、毎週のスプリントで具体的な行動を決めていく',
            score: 150,
            feedback:
              '完璧なアジャイルマインド！大きな方向性を持ちながら、細部は柔軟に。これが1年間で身につけた知恵です！',
            isAgile: true,
          },
          {
            text: '365日分の詳細計画を年明けに一気に作る',
            score: 20,
            feedback:
              '365日後の未来は予測できません。アジャイルは変化に対応できる計画の立て方を大切にします。',
            isAgile: false,
          },
          {
            text: '計画なしに行き当たりばったりで進む',
            score: 30,
            feedback:
              '方向性なしでは進めません。ゴールは持ちながら、道は柔軟に。それがアジャイルです。',
            isAgile: false,
          },
        ],
        agileLesson:
          '「北極星（方向性）を持ちながら、毎週のスプリントで具体的に動く」これがアジャイルの1年の歩み方よ。完璧な計画より適応する力。あなたはこの1年でそれを八百屋という現場で学んだ。それが最上の教育よ！',
        agileKeyword: 'アジャイルな年間計画',
      },
    ],
  },
];

// ============================================================
// 称号システム
// ============================================================
const getTitleByScore = (score: number): { title: string; emoji: string; color: string } => {
  if (score >= 700) return { title: 'アジャイルマスター', emoji: '🥇', color: 'text-yellow-600' };
  if (score >= 500) return { title: 'スムージー職人', emoji: '🥈', color: 'text-slate-500' };
  if (score >= 300) return { title: '見習い店主', emoji: '🥉', color: 'text-amber-600' };
  return { title: 'まだまだこれから', emoji: '🌱', color: 'text-green-600' };
};

// ============================================================
// メインコンポーネント
// ============================================================
export default function AgileYasaiPage() {
  // ゲーム状態
  const [phase, setPhase] = useState<GamePhase>('title');
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [scenarioScore, setScenarioScore] = useState<number>(0);
  // 解放済みシナリオID一覧（プレイできる話）：初期は第1話=id:1のみ
  const [unlockedScenarios, setUnlockedScenarios] = useState<number[]>([1]);
  // クリア済みシナリオID一覧（完了した話）：初期は空
  const [clearedScenarios, setClearedScenarios] = useState<number[]>([]);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [highScores, setHighScores] = useState<Record<number, number>>({});

  // ハイスコアと解放状況をlocalStorageから読み込み
  useEffect(() => {
    try {
      const savedHighScores = localStorage.getItem('agile-yasai-highscores');
      if (savedHighScores) setHighScores(JSON.parse(savedHighScores));
      const savedUnlocked = localStorage.getItem('agile-yasai-unlocked');
      if (savedUnlocked) setUnlockedScenarios(JSON.parse(savedUnlocked));
      const savedCleared = localStorage.getItem('agile-yasai-cleared');
      if (savedCleared) setClearedScenarios(JSON.parse(savedCleared));
    } catch {
      // localStorageが使えない環境ではスキップ
    }
  }, []);

  // 現在のシナリオと問題
  const currentScenario = SCENARIOS[currentScenarioIndex];
  const currentQuestion = currentScenario?.questions[currentQuestionIndex];

  // ----------------------------------------------------------
  // シナリオ開始処理
  // ----------------------------------------------------------
  const startScenario = (scenarioIndex: number) => {
    setCurrentScenarioIndex(scenarioIndex);
    setCurrentQuestionIndex(0);
    setScenarioScore(0);
    setSelectedChoice(null);
    setShowHint(false);
    setPhase('playing');
  };

  // ----------------------------------------------------------
  // 選択肢を選んだときの処理
  // ----------------------------------------------------------
  const handleChoiceSelect = (choice: Choice) => {
    setSelectedChoice(choice);
    setScenarioScore(prev => prev + choice.score);
    setTotalScore(prev => prev + choice.score);
    setPhase('result-popup');
  };

  // ----------------------------------------------------------
  // 次の問題へ進む処理
  // ----------------------------------------------------------
  const handleNextQuestion = () => {
    const isLastQuestion = currentQuestionIndex >= currentScenario.questions.length - 1;
    if (isLastQuestion) {
      // 最後の問題 → 最上先生メッセージへ
      setPhase('master-message');
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedChoice(null);
      setShowHint(false);
      setPhase('playing');
    }
  };

  // ----------------------------------------------------------
  // シナリオ完了処理
  // ----------------------------------------------------------
  const handleScenarioComplete = () => {
    const scenarioId = currentScenario.id;

    // クリア済みリストに追加（まだ入っていない場合）
    const newCleared = clearedScenarios.includes(scenarioId)
      ? clearedScenarios
      : [...clearedScenarios, scenarioId];

    // 次のシナリオを解放（次のIDをunlockedに追加）
    const nextId = scenarioId + 1;
    const newUnlocked = unlockedScenarios.includes(nextId)
      ? unlockedScenarios
      : [...unlockedScenarios, nextId];

    setClearedScenarios(newCleared);
    setUnlockedScenarios(newUnlocked);

    // ハイスコア更新
    const newHighScores = {
      ...highScores,
      [scenarioId]: Math.max(highScores[scenarioId] || 0, scenarioScore),
    };
    setHighScores(newHighScores);

    // localStorageに保存
    try {
      localStorage.setItem('agile-yasai-highscores', JSON.stringify(newHighScores));
      localStorage.setItem('agile-yasai-unlocked', JSON.stringify(newUnlocked));
      localStorage.setItem('agile-yasai-cleared', JSON.stringify(newCleared));
    } catch {
      // スキップ
    }
    setPhase('score');
  };

  // ============================================================
  // 画面レンダリング
  // ============================================================

  // ----------------------------------------------------------
  // タイトル画面
  // ----------------------------------------------------------
  if (phase === 'title') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {/* メインカード */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full p-8 text-center">
          {/* タイトル */}
          <div className="mb-6">
            <div className="text-6xl mb-3">🥬</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">八百屋アジャイル道場</h1>
            <p className="text-slate-500 text-sm">〜スムージー、始めました〜</p>
          </div>

          {/* 最上先生のひとこと */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <div className="text-3xl">👩‍🏫</div>
              <div>
                <p className="text-sky-700 font-bold text-sm mb-1">最上先生より</p>
                <p className="text-sky-800 text-sm leading-relaxed">
                  「アジャイルは難しくない。まず1杯のスムージーを作ることから、全部が始まるのよ。さあ、八百屋の店主として体験してみましょう！」
                </p>
              </div>
            </div>
          </div>

          {/* ゲーム説明 */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-slate-600 text-xs leading-relaxed">
              🎮 <strong>遊び方</strong>：八百屋の店主として5つのシナリオを体験。<br />
              お客さんとのやり取りやハプニングに対して3択で回答。<br />
              アジャイルの5つの要素を自然に学べます。
            </p>
          </div>

          {/* スタートボタン */}
          <button
            onClick={() => setPhase('scenario-select')}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-colors text-lg"
          >
            🥬 道場に入る
          </button>

          {/* トータルスコア表示 */}
          {totalScore > 0 && (
            <p className="text-slate-400 text-sm mt-4">累計スコア: {totalScore}pt</p>
          )}
        </div>

        {/* オマージュ表記 */}
        <p className="text-slate-400 text-xs mt-4 text-center">
          最上千佳子先生の「ITILはじめの一歩」へのオマージュ
        </p>
      </div>
    );
  }

  // ----------------------------------------------------------
  // シナリオ選択画面
  // ----------------------------------------------------------
  if (phase === 'scenario-select') {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* ヘッダー */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-1">📖 シナリオを選ぶ</h2>
            <p className="text-slate-500 text-sm">前の話をクリアすると次が解放されます</p>
          </div>

          {/* シナリオ一覧 */}
          <div className="space-y-3">
            {SCENARIOS.map((scenario, index) => {
              // 解放済みかどうか（unlockedScenariosで判定）
              const isUnlocked = unlockedScenarios.includes(scenario.id);
              // クリア済みかどうか（clearedScenariosで判定）
              const isCleared = clearedScenarios.includes(scenario.id);
              const hs = highScores[scenario.id] || 0;

              return (
                <button
                  key={scenario.id}
                  onClick={() => isUnlocked && startScenario(index)}
                  disabled={!isUnlocked}
                  className={`w-full bg-white rounded-2xl border shadow-sm p-4 text-left transition-all
                    ${isUnlocked
                      ? `border-slate-200 hover:border-${scenario.color}-300 hover:shadow-md cursor-pointer`
                      : 'border-slate-100 opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* 季節アイコン */}
                    <div className={`text-3xl ${!isUnlocked && 'grayscale'}`}>
                      {isUnlocked ? scenario.season : '🔒'}
                    </div>
                    {/* テキスト */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-slate-800 text-sm">{scenario.title}</p>
                        {isCleared && <span className="text-xs text-green-600 font-bold">✅クリア</span>}
                      </div>
                      <p className="text-slate-500 text-xs">{scenario.agileElement}</p>
                      {isCleared && (
                        <p className="text-amber-600 text-xs font-bold mt-0.5">🏆 ベスト: {hs}pt</p>
                      )}
                    </div>
                    {/* 矢印 */}
                    {isUnlocked && (
                      <div className="text-slate-300 text-xl">›</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 戻るボタン */}
          <button
            onClick={() => setPhase('title')}
            className="w-full mt-4 py-3 text-slate-500 hover:text-slate-700 text-sm transition-colors"
          >
            ← タイトルに戻る
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // プレイ中画面
  // ----------------------------------------------------------
  if (phase === 'playing' && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* ヘッダー：進捗 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentScenario.season}</span>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{currentScenario.title}</p>
                  <p className={`text-xs font-bold ${currentScenario.textColor}`}>
                    {currentScenario.agileElement}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-amber-600 font-bold text-sm">⭐ {scenarioScore}pt</p>
                <p className="text-slate-400 text-xs">
                  {currentQuestionIndex + 1} / {currentScenario.questions.length}問
                </p>
              </div>
            </div>
            {/* プログレスバー */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-${currentScenario.color}-400 transition-all duration-500`}
                style={{ width: `${((currentQuestionIndex) / currentScenario.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 問題カード */}
          <div className={`bg-white rounded-2xl border ${currentScenario.borderColor} shadow-sm p-5 mb-4`}>
            {/* キャラクターとシチュエーション */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{currentQuestion.characterEmoji}</span>
              <div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentScenario.bgColor} ${currentScenario.textColor}`}>
                  {currentQuestion.type === 'customer' ? '👤 お客さん' : '🎲 ハプニング！'}
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentQuestion.character}｜{currentQuestion.situation}
                </p>
              </div>
            </div>

            {/* セリフ・状況 */}
            <div className={`${currentScenario.bgColor} rounded-xl p-4 mb-4`}>
              <p className="text-slate-700 text-sm leading-relaxed font-medium">
                「{currentQuestion.dialogue}」
              </p>
            </div>

            {/* 選択肢 */}
            <p className="text-slate-600 text-xs font-bold mb-2">あなたの選択：</p>
            <div className="space-y-2">
              {currentQuestion.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoiceSelect(choice)}
                  className="w-full text-left border border-slate-200 hover:border-sky-300 hover:bg-sky-50 rounded-xl p-3 transition-all text-sm text-slate-700"
                >
                  <span className="font-bold text-slate-400 mr-2">{['A', 'B', 'C'][idx]}.</span>
                  {choice.text}
                </button>
              ))}
            </div>
          </div>

          {/* 最上先生ヒントボタン */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            {!showHint ? (
              <button
                onClick={() => setShowHint(true)}
                className="w-full text-sky-600 hover:text-sky-800 text-sm font-bold transition-colors"
              >
                👩‍🏫 最上先生にヒントを聞く
              </button>
            ) : (
              <div className="flex items-start gap-2">
                <span className="text-2xl">👩‍🏫</span>
                <div>
                  <p className="text-sky-700 font-bold text-xs mb-1">最上先生のヒント</p>
                  <p className="text-sky-800 text-xs leading-relaxed">
                    「アジャイルのキーワード：<strong>{currentQuestion.agileKeyword}</strong>。
                    小さく始めて、お客さんの反応を見ながら改善することを考えてみて！」
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // 結果ポップアップ画面
  // ----------------------------------------------------------
  if (phase === 'result-popup' && selectedChoice && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="max-w-lg w-full">
          {/* 正解・不正解バナー */}
          <div className={`rounded-2xl p-5 mb-4 text-center ${
            selectedChoice.isAgile
              ? 'bg-green-50 border-2 border-green-300'
              : 'bg-amber-50 border-2 border-amber-300'
          }`}>
            <div className="text-4xl mb-2">
              {selectedChoice.isAgile ? '✅' : '💡'}
            </div>
            <p className={`font-bold text-lg mb-1 ${
              selectedChoice.isAgile ? 'text-green-700' : 'text-amber-700'
            }`}>
              {selectedChoice.isAgile ? 'アジャイル的！' : '別の視点もあります'}
            </p>
            <p className={`font-bold text-2xl ${
              selectedChoice.isAgile ? 'text-green-600' : 'text-amber-600'
            }`}>
              +{selectedChoice.score}pt
            </p>
          </div>

          {/* フィードバック */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
            <p className="text-slate-700 text-sm leading-relaxed mb-4">{selectedChoice.feedback}</p>

            {/* 最上先生の解説 */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <span className="text-2xl">👩‍🏫</span>
                <div>
                  <p className="text-sky-700 font-bold text-xs mb-1">
                    最上先生の解説｜<span className="text-sky-600">{currentQuestion.agileKeyword}</span>
                  </p>
                  <p className="text-sky-800 text-xs leading-relaxed">
                    {currentQuestion.agileLesson}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 次へボタン */}
          <button
            onClick={handleNextQuestion}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-colors"
          >
            {currentQuestionIndex >= currentScenario.questions.length - 1
              ? '最上先生の総括を聞く →'
              : '次の問題へ →'}
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // 最上先生メッセージ画面
  // ----------------------------------------------------------
  if (phase === 'master-message') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="max-w-lg w-full">
          {/* メッセージカード */}
          <div className="bg-white rounded-2xl border border-sky-300 shadow-sm p-6 mb-4">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">👩‍🏫</div>
              <h3 className="font-bold text-slate-800 text-lg">最上先生より</h3>
              <p className={`text-sm font-bold ${currentScenario.textColor} mt-1`}>
                {currentScenario.season} {currentScenario.title}
              </p>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5">
              <p className="text-sky-800 text-sm leading-relaxed">
                {currentScenario.masterMessage}
              </p>
            </div>

            <div className={`mt-4 ${currentScenario.bgColor} rounded-xl p-3 text-center`}>
              <p className="text-xs text-slate-600 mb-1">今回学んだこと</p>
              <p className={`font-bold ${currentScenario.textColor}`}>
                {currentScenario.agileElement}
              </p>
              <p className="text-slate-500 text-xs mt-1">{currentScenario.agileDescription}</p>
            </div>
          </div>

          {/* スコア確認ボタン */}
          <button
            onClick={handleScenarioComplete}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-colors"
          >
            🏆 結果を見る
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // スコア画面
  // ----------------------------------------------------------
  if (phase === 'score') {
    const titleData = getTitleByScore(scenarioScore);
    const maxScore = currentScenario.questions.length * 150; // 全問正解の最大スコア
    const percentage = Math.round((scenarioScore / maxScore) * 100);
    const isLastScenario = currentScenarioIndex >= SCENARIOS.length - 1;
    const nextScenarioIndex = currentScenarioIndex + 1;

    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="max-w-lg w-full">
          {/* スコアカード */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4 text-center">
            <div className="text-5xl mb-2">{titleData.emoji}</div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">
              {currentScenario.title} クリア！
            </h3>
            <p className={`font-bold text-lg mb-4 ${titleData.color}`}>{titleData.title}</p>

            {/* スコア表示 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-600 text-3xl font-bold">{scenarioScore} pt</p>
              <p className="text-amber-500 text-sm">/ {maxScore}pt ({percentage}%)</p>
            </div>

            {/* 学んだこと */}
            <div className={`${currentScenario.bgColor} border ${currentScenario.borderColor} rounded-xl p-4 mb-4 text-left`}>
              <p className="text-xs text-slate-500 mb-1">📖 今回学んだアジャイル要素</p>
              <p className={`font-bold ${currentScenario.textColor}`}>
                {currentScenario.season} {currentScenario.agileElement}
              </p>
              <p className="text-slate-500 text-xs mt-1">{currentScenario.agileDescription}</p>
            </div>

            {/* 最上先生の締め */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-4 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl">👩‍🏫</span>
                <p className="text-sky-700 text-xs">
                  {percentage >= 80
                    ? '素晴らしい！アジャイルの本質を掴んでいるわ！'
                    : percentage >= 60
                    ? 'よくできました。もう一度やるとさらに深く理解できるわよ。'
                    : 'もう一度チャレンジしてみましょう。失敗から学ぶことがアジャイルよ！'}
                </p>
              </div>
            </div>
          </div>

          {/* ボタン群 */}
          <div className="space-y-3">
            {/* 次のシナリオへ：最終話でなく、次が解放済みの場合に表示 */}
            {!isLastScenario && unlockedScenarios.includes(SCENARIOS[nextScenarioIndex].id) && (
              <button
                onClick={() => startScenario(nextScenarioIndex)}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-colors"
              >
                {SCENARIOS[nextScenarioIndex].season} 次の話へ進む
              </button>
            )}

            {/* もう一度 */}
            <button
              onClick={() => startScenario(currentScenarioIndex)}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
            >
              🔄 もう一度挑戦する
            </button>

            {/* シナリオ選択に戻る */}
            <button
              onClick={() => setPhase('scenario-select')}
              className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm transition-colors"
            >
              ← シナリオ選択に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // フォールバック
  return null;
}
