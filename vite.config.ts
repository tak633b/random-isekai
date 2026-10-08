import { defineConfig } from 'vite';

// 相対パスで出すので、GitHub Pages のような下位ディレクトリにも置ける
export default defineConfig({
  base: './',
  // 開発中は追悼館の API を server/server.mjs (npm run dev:server) へ回す
  server: { proxy: { '/api': 'http://localhost:8790' } },
});
