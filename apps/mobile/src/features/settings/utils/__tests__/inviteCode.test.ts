/**
 * validateInviteCode のテスト
 *
 * EXPO_PUBLIC_INVITE_CODE 環境変数が設定されている場合のみ有効コードを受け入れる。
 * 入力値の前後スペースはトリムしてから検証する。
 */

// モジュールをロードする前に環境変数を設定する
const VALID_CODE = 'test-invite-code-2026';

// jest.isolateModulesは各テストケースで呼ぶ
describe('validateInviteCode: 環境変数あり', () => {
  beforeEach(() => {
    process.env['EXPO_PUBLIC_INVITE_CODE'] = VALID_CODE;
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env['EXPO_PUBLIC_INVITE_CODE'];
  });

  it('正確なコードを入力すると true を返すこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode(VALID_CODE)).toBe(true);
  });

  it('前後スペース付きの正確なコードでも true を返すこと（trim処理）', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode(`  ${VALID_CODE}  `)).toBe(true);
  });

  it('誤ったコードを入力すると false を返すこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode('wrong-code')).toBe(false);
  });

  it('空文字を入力すると false を返すこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode('')).toBe(false);
  });

  it('スペースのみの入力は false を返すこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode('   ')).toBe(false);
  });
});

describe('validateInviteCode: 環境変数なし（未設定）', () => {
  beforeEach(() => {
    delete process.env['EXPO_PUBLIC_INVITE_CODE'];
    jest.resetModules();
  });

  it('環境変数未設定の場合、いかなる入力でも false を返すこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode('any-code')).toBe(false);
  });

  it('環境変数が空文字の場合も false を返すこと', () => {
    process.env['EXPO_PUBLIC_INVITE_CODE'] = '';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateInviteCode } = require('../inviteCode') as {
      validateInviteCode: (input: string) => boolean;
    };
    expect(validateInviteCode('')).toBe(false);
  });
});
