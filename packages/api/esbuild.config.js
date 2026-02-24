// Lambda 用バンドル設定（esbuild で CommonJS 出力）
import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// @aws-sdk/* は Lambda ランタイムにバンドル済みのため外部化
const externalPackages = Object.keys(pkg.dependencies ?? {}).filter(
  (dep) => dep.startsWith('@aws-sdk/'),
);

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: externalPackages,
});

console.log('Build complete: dist/index.js');
