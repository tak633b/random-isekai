/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// 相対パスで出すので、GitHub Pages のような下位ディレクトリにも置ける
export default defineConfig({
  base: './',
  // 開発中は追悼館の API を server/server.mjs (npm run dev:server) へ回す
  server: { proxy: { '/api': 'http://localhost:8790' } },
  // 何百本もの人生を生きるテストが多く、GitHub Actions では手元の3倍ほどかかる。既定の5秒では足りない
  test: { testTimeout: 60_000 },
});
