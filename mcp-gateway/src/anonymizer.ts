/**
 * anonymizer.ts
 * 個人情報マスク処理ユーティリティ
 *
 * Claudeに渡す前に個人情報を匿名化する。
 * オンプレデータがそのままクラウドに漏れないよう、
 * このモジュールを必ずデータアダプタの出力に通すこと。
 */

// 匿名化対象フィールド名のキーワード（部分一致）
// ※ 「名」単体は「地区名」「施設名」など業務用語にも含まれるため除外
// ※ 個人を特定できる複合語のみ対象にする
const SENSITIVE_FIELD_KEYWORDS = [
  '氏名', '名前', '姓名', 'fullname', 'full_name',
  '住所', '番地', 'address',
  'マイナンバー', '個人番号', 'my_number', 'mynumber',
  '電話番号', 'tel', 'phone',
  'メールアドレス', 'email', 'mail',
  '生年月日', '誕生日', 'birthday', 'birth_date',
  'パスワード', 'password',
  '口座番号', '銀行口座',
]

/**
 * フィールド名が個人情報に該当するか判定する
 */
function isSensitiveField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase()
  return SENSITIVE_FIELD_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()))
}

/**
 * 1レコード（オブジェクト）の個人情報フィールドをマスクする
 * 例: { 氏名: "山田太郎", 年齢: 65 } → { 氏名: "***", 年齢: 65 }
 */
export function anonymizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (isSensitiveField(key)) {
      result[key] = '***' // 個人情報フィールドはマスク
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * レコード配列全体を匿名化する
 */
export function anonymizeRecords(records: Record<string, unknown>[]): Record<string, unknown>[] {
  return records.map(anonymizeRecord)
}

/**
 * 匿名化されたフィールドの一覧をログ用に返す
 */
export function listMaskedFields(record: Record<string, unknown>): string[] {
  return Object.keys(record).filter(isSensitiveField)
}
