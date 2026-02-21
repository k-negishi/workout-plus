/**
 * グローバルpolyfill
 *
 * HermesエンジンはWeb標準の crypto.getRandomValues を実装していないため補完する。
 * ulid パッケージ等、PRNG として crypto.getRandomValues を要求するライブラリが
 * 正常動作するために、このファイルを index.ts で最初に import する。
 *
 * セキュリティ用途ではなく ID 生成のみに使用するため Math.random ベースで十分。
 */

if (typeof global.crypto?.getRandomValues !== 'function') {
  // @ts-expect-error Hermes 環境では global.crypto が未定義のため上書きする
  global.crypto = {
    ...(typeof global.crypto === 'object' ? global.crypto : {}),
    getRandomValues: <T extends ArrayBufferView>(buffer: T): T => {
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        // Math.random を 0-255 の整数にマッピング
        uint8[i] = Math.floor(Math.random() * 256);
      }
      return buffer;
    },
  };
}
