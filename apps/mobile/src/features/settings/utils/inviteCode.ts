/**
 * 招待コード検証ユーティリティ
 *
 * EXPO_PUBLIC_INVITE_CODE 環境変数（ビルド時注入）と比較して
 * 入力コードが有効かどうかを判定する。
 * 入力値の前後スペースはトリムしてから比較する。
 */

/** ビルド時に注入される有効な招待コード */
const VALID_INVITE_CODE = process.env['EXPO_PUBLIC_INVITE_CODE'] ?? '';

/**
 * 招待コードを検証する
 * @param input ユーザーが入力したコード
 * @returns 有効な場合 true、無効（空文字・不一致）の場合 false
 */
export function validateInviteCode(input: string): boolean {
  // 環境変数が未設定の場合はいかなる入力も無効
  if (VALID_INVITE_CODE.length === 0) return false;
  return input.trim() === VALID_INVITE_CODE;
}
