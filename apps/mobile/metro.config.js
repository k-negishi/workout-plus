const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpmワークスペースのsymlinkをMetroが解決できるようにする
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// pnpm はパッケージを symlink で管理するため、Metro の symlink 追跡を有効化する
// これがないと node_modules/.pnpm/... の実体を解決できずクラッシュする
config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, { input: './src/global.css' });
