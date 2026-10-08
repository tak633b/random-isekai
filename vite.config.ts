import { defineConfig } from 'vite';

// 相対パスで出すので、GitHub Pages のような下位ディレクトリにも置ける
export default defineConfig({
  base: './',
});
