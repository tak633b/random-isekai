/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';

// AdSense: VITE_ADSENSE_CLIENT (ca-pub-…) があるときだけ、確認用の meta と adsbygoogle.js を <head> に足す。
// 同意の管理 (EEA・英国・スイス) は AdSense の「プライバシーとメッセージ」で作った CMP がこのタグから出る。docs/DEPLOY.md
function adsense(client: string, placeholder: boolean): Plugin {
  return {
    name: 'adsense',
    transformIndexHtml: () => (/^ca-pub-\d{10,20}$/.test(client) && !placeholder ? [
      { tag: 'meta', attrs: { name: 'google-adsense-account', content: client }, injectTo: 'head' },
      { tag: 'script', attrs: { async: true, src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`, crossorigin: 'anonymous' }, injectTo: 'head' },
    ] : []),
  };
}

// 相対パスで出すので、GitHub Pages のような下位ディレクトリにも置ける
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: './',
    plugins: [adsense(env.VITE_ADSENSE_CLIENT ?? '', env.VITE_ADS_PLACEHOLDER === '1')],
    // 開発中は追悼館の API を server/server.mjs (npm run dev:server) へ回す
    server: { proxy: { '/api': 'http://localhost:8790' } },
    // 何百本もの人生を生きるテストが多く、GitHub Actions では手元の3倍ほどかかる。既定の5秒では足りない
    test: { testTimeout: 60_000 },
  };
});
