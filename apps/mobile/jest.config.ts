import type { Config } from 'jest';

const config: Config = {
  projects: [
    // プロジェクト1: Expo/RN依存のコンポーネントテスト（.tsx）— 将来用
    // 現在 .test.tsx ファイルは存在しないが、コンポーネントUIテスト追加時に使用
    {
      displayName: 'components',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.tsx',
      ],
      transformIgnorePatterns: [
        // jest-expo 54 のデフォルトパターンを踏襲しつつ、追加パッケージを列挙する。
        // pnpm は .pnpm/ にパッケージをフラット展開するため先頭に .pnpm を含める。
        // leading `/` を付けることで jest-expo と同じ絶対パス形式に一致させる。
        '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|@gorhom/bottom-sheet|burnt|zustand|date-fns|ulid|react-native-calendars|react-native-gifted-charts|expo-modules-core|expo-sqlite))',
      ],
      setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    // プロジェクト2: 全ロジックテスト（.test.ts）— hookテスト含む
    // expo-sqlite は ESMのみ配布のため moduleNameMapper でスタブ化して回避
    {
      displayName: 'logic',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
      transform: {
        '\\.[jt]sx?$': 'babel-jest',
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        // expo-sqlite は ESM のみ配布。babel-jest 環境でのパースエラーを回避するためスタブ化
        '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
      },
    },
  ],
  collectCoverageFrom: [
    // ロジック層のみカバレッジ対象
    // UI コンポーネント・スクリーン・ナビゲーションは jest-expo + Expo 54 + pnpm の
    // 互換性問題が解決されるまでE2Eテストで担保する
    'src/**/utils/**/*.ts',
    'src/**/hooks/**/*.ts',
    'src/stores/**/*.ts',
    '!src/**/*.d.ts',
    // 以下は React の useState/useEffect を多用しており renderHook が必要（jest-expo 互換性修正後にテスト追加予定）
    '!src/**/hooks/useTimer.ts',
    '!src/**/hooks/useWorkoutSession.ts',
    '!src/**/hooks/usePreviousRecord.ts',
    // ストア re-export index は実体のないバレルファイルのため除外
    '!src/stores/index.ts',
    // __tests__ ディレクトリ内のファイルはカバレッジ対象から除外（テストファイル自体は計測しない）
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      // ロジック層の目標カバレッジ
      // （jest-expo 互換性修正後に UI 層・React hook テストを追加して 90% に引き上げる）
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;
