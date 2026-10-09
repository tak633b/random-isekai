# Cloudflare に出す手順

Random Isekai を、自分のドメインで Cloudflare Pages に出し、追悼館を D1 で動かし、Google AdSense の広告を載せるまでの手順です。上から順に進めてください。コマンドはすべてリポジトリの直下 (`random-isekai/`) で実行します。

## 全体の形

| 部分 | 置き場所 | 中身 |
|---|---|---|
| ゲーム本体 (静的) | Cloudflare Pages | `npm run build` が作る `dist/` (法務ページ・`ads.txt`・`robots.txt` などは `public/` から入る) |
| 追悼館の API | Pages Functions | `functions/api/[[path]].js` → `server/cf-api.mjs`。道と返す形は `server/server.mjs` (Node 版) と同じ |
| 追悼館のデータ | Cloudflare D1 | `migrations/0001_memorial.sql` |
| 広告 | Google AdSense | `src/ui/ads.ts` (枠) と `vite.config.ts` (タグ)。ID はビルド時の環境変数 |
| 出す仕組み | GitHub Actions | `.github/workflows/cloudflare.yml` (テスト → ビルド → D1 マイグレーション → Pages) |

AI 機能は、ブラウザから OpenRouter (または自分で入れた URL) を直接呼びます。サーバーは中継せず、API キーを受け取りません。OpenRouter はブラウザからの呼び出し (CORS) を許しています。

送信量の制限は D1 の表 `rate` で数えています (固定の時間窓。投稿は1分に3件・1日に50件、ろうそくは1分に20回、報告は1時間に10回)。IP はそのまま残さず、`ADMIN_TOKEN` を鍵にした HMAC に変えて使います。Cloudflare の Rate Limiting の仕組みは Pages Functions から使いにくく、KV は書き込みが1日1000回までと少ないため、D1 にしました。外側の守りとして、手順 5 の最後に WAF のルールを1本足すことを勧めます。

## 手元で確かめる (アカウント不要)

```sh
npm ci
npm test
# 広告の位置を灰色の箱で出すビルドと、手元の D1
VITE_ADS_PLACEHOLDER=1 npx vite build
npx wrangler d1 migrations apply random-isekai-memorial --local
npx wrangler pages dev --port 8788 --binding ADMIN_TOKEN=local-admin-token-0123456789
# 別の端末で (Playwright の場所を渡す)
PLAYWRIGHT_PATH=/path/to/playwright node scripts/e2e-cloudflare.mjs http://127.0.0.1:8788/
```

止めるときは `wrangler pages dev` を Ctrl+C。手元の D1 は `.wrangler/` にあり、消してよいものです。

## 済んだこと (2026-10-09)

手順 1〜4 は済んでいます。まだ何も出していません (デプロイ前)。

| 手順 | 状態 |
|---|---|
| 1. ドメイン | `randomisekai.com`。`index.html` と `public/` (canonical・og:url・og:image・robots.txt・sitemap.xml) に入れ済み |
| 2. wrangler のログイン | 済み |
| 3. D1 | `random-isekai-memorial` (id `6f283ca7-0410-4098-927c-302534b91b4c`) を作成し、`wrangler.toml` に記入。`0001_memorial.sql` を `--remote` で適用済み |
| 4. Pages と秘密 | プロジェクト `random-isekai` (本番ブランチ `main`) を作成。`ADMIN_TOKEN` を設定済み。控えは `~/.config/random-isekai/admin-token` (権限 600) |
| 法務ページ | 運営者・連絡先・管轄裁判所・日付を記入済み |

やり直すときや、別のアカウントで作り直すときのコマンドは次のとおりです。

```sh
npx wrangler login
npx wrangler whoami                                   # Account ID (手順 6 で使う)
npx wrangler d1 create random-isekai-memorial         # 出た database_id を wrangler.toml へ
npx wrangler d1 migrations apply random-isekai-memorial --remote
npx wrangler pages project create random-isekai --production-branch main
openssl rand -base64 32                               # 管理者の合言葉
npx wrangler pages secret put ADMIN_TOKEN --project-name random-isekai
```

`ADMIN_TOKEN` はコードにも GitHub にも書きません。16文字未満だと管理の道は開きません。

管理者の使い方:

```sh
SITE=https://randomisekai.com
TOKEN=$(cat ~/.config/random-isekai/admin-token)
# 報告のあった記録 (非表示のものも)
curl -H "Authorization: Bearer $TOKEN" $SITE/api/admin/reported
# 番号 123 を隠す / 戻す
curl -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"hidden":true}'  $SITE/api/admin/memorial/123/hide
curl -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"hidden":false}' $SITE/api/admin/memorial/123/hide
```

読者の報告が3人 (`wrangler.toml` の `REPORT_HIDE`) に達すると、記録は自動で非表示になります。完全に消したいときは:

```sh
npx wrangler d1 execute random-isekai-memorial --remote --command "DELETE FROM memorial WHERE id = 123"
```

## 5. Pages に最初に出して、ドメインを付ける

手元から出すと、作業ツリーにあるもの (コミット前の変更も) がそのまま出ます。テストが緑のコミットに揃えてから出すか、手順 6〜7 を先に済ませて Actions に出させてください。

```sh
npm run build
npx wrangler pages deploy --project-name random-isekai --branch main
```

`https://random-isekai.pages.dev` (プロジェクトを作ったときに出た `*.pages.dev`) で開き、`/api/health` が `{"success":true,…}` を返すことを確かめたら、ダッシュボードの **Workers & Pages → random-isekai → Custom domains → Set up a custom domain** で `randomisekai.com` を付けます。`www.randomisekai.com` も付けておくと、www 付きで来た人も開けます。ドメインが同じ Cloudflare アカウントにあれば DNS は自動で入り、証明書が出るまで数分〜十数分かかります。

確かめる:

```sh
curl https://randomisekai.com/api/health          # {"success":true,"data":{"ok":true}}
curl -I https://randomisekai.com/ads.txt
```

(勧め) **Security → WAF → Rate limiting rules** で、`URI Path starts with /api/` に「10秒に20回まで (IP ごと)」のルールを1本。無料プランで1本作れます。

## 6. GitHub の秘密

リポジトリの **Settings → Secrets and variables → Actions**:

- Secrets
  - `CLOUDFLARE_API_TOKEN`: https://dash.cloudflare.com/profile/api-tokens → Create Token → Custom token。権限は **Account / Cloudflare Pages / Edit** と **Account / D1 / Edit** の2つだけ
  - `CLOUDFLARE_ACCOUNT_ID`: `npx wrangler whoami` が出す Account ID
- Variables (広告の ID。手順 8 のあとで入れる。空なら広告なしでビルドされる)
  - `VITE_ADSENSE_CLIENT` (`ca-pub-…`)、`VITE_ADSENSE_SLOT_TITLE`、`VITE_ADSENSE_SLOT_DEATH`、`VITE_ADSENSE_SLOT_PAST`、`VITE_ADSENSE_SLOT_COLLECTION`

## 7. 自動で出す

この準備 (`wrangler.toml` の database_id、ドメインと法務ページの記入を含む) をコミットして `main` に push すると、`.github/workflows/cloudflare.yml` がテスト → ビルド → D1 マイグレーション → Pages の順に進めます。Actions のタブで緑になったことを確かめてください。秘密が無いあいだは、テストとビルドだけをして出しません。

GitHub Pages の流れ (`.github/workflows/pages.yml`) も `main` への push で動きます。Cloudflare で動いたことを確かめたら、**pages.yml を止める** ことを勧めます (GitHub の Actions → pages → Disable workflow、またはファイルを消す)。GitHub Pages には追悼館が無く、同じゲームが2か所にあると検索で評価が割れるためです。残すなら、`index.html` の canonical が Cloudflare の側を指しているので害は小さいです。

## 8. AdSense に申し込む

サイトが公開されていて、プライバシーポリシー (`/privacy`) が開ける状態で申し込みます。

1. 法務ページ (`/privacy`・`/terms`・`/contact`・`/about`) の運営者・連絡先は記入済み。公開後、4つとも開けることを確かめる。
2. https://adsense.google.com で申し込み、サイトに自分のドメインを入れる。
3. 「サイト運営者 ID」(`ca-pub-` で始まる16桁) が出たら:
   - GitHub の Variables に `VITE_ADSENSE_CLIENT=ca-pub-…` を入れる (これで `<head>` に確認用の meta と AdSense のタグが入る)
   - `public/ads.txt` の `pub-0000000000000000` を自分の `pub-…` に置き換える
   - push して、`https://randomisekai.com/ads.txt` が開けることを確かめる
4. AdSense の画面で「サイトを審査する」。審査には数日〜数週間かかります。
5. 承認されたら、**広告 → 広告ユニットごと → ディスプレイ広告** を4つ作り (名前は title / death / past / collection など)、それぞれの `data-ad-slot` の数字を Variables の `VITE_ADSENSE_SLOT_TITLE` / `_DEATH` / `_PAST` / `_COLLECTION` に入れて push。
6. **自動広告はオフ** にしておく。自動広告は人生の途中や選択の画面にも広告を差し込み、遊びの邪魔になるためです。広告は次の4か所だけに出します。
   - タイトルの下 (ボタンの並びと注意書きの下)
   - 死亡記録のいちばん下 (記録とボタンの並びより下)
   - 過去の人生の一覧のいちばん下 (記録が1件以上あるとき)
   - 図鑑のいちばん下 (中身があるとき)
   - 人生の途中・戦い・選択のモーダル・追悼館には出しません

## 9. 同意の管理 (CMP)

EEA・英国・スイスからのアクセスには、Google 認定の同意管理ツール (CMP) が必要です。AdSense に入っている Google 自身の CMP を使えば、コードの変更はいりません (同じ AdSense のタグから出ます)。

1. AdSense の **プライバシーとメッセージ → 欧州の規制** で「作成」。
2. サイトに自分のドメインを選び、言語は日本語と英語を足す。プライバシーポリシーの URL に `https://randomisekai.com/privacy` を入れる。
3. 「同意しない」ボタンを出す設定を選び、公開する。
4. (任意) **米国の州の規制** のメッセージも同じ画面で作れます。

確かめ方: ブラウザの VPN などで EEA から開くと、初回に同意の画面が出ます。同意しなかった場合も、Google が制限付きの広告に切り替えます。ゲームのコードはどちらの場合も同じに動きます (広告が出なくても遊びは止まりません)。

## 10. うまくいかないとき (戻し方)

- **直前の版に戻す**: ダッシュボードの **Workers & Pages → random-isekai → Deployments** で、前の版の「…」→ **Rollback to this deployment**。数秒で切り替わります。コマンドなら `npx wrangler pages deployment list --project-name random-isekai` で ID を見てから、ダッシュボードで戻す。
- **広告だけ止める**: GitHub の Variables から `VITE_ADSENSE_CLIENT` を消して Actions を再実行 (Run workflow)。広告の枠もタグも出なくなります。
- **追悼館だけ止める**: `functions/` を消して出し直すと、ゲームは「追悼館はサーバーで動かすと使える」の案内に切り替わり、ほかはそのまま遊べます。
- **D1 を前の状態に戻す**: D1 は過去の状態を自動で残しています (無料プランは7日、有料は30日)。`npx wrangler d1 time-travel info random-isekai-memorial` で時点を見て、`npx wrangler d1 time-travel restore random-isekai-memorial --timestamp=<時刻>`。
- **GitHub Pages に戻す**: pages.yml を再び有効にして push、ドメインの DNS を GitHub Pages に向け直す。

## 費用の目安

小さく始めるかぎり、ドメイン代のほかはかかりません。

| もの | 無料の範囲 | 超えると |
|---|---|---|
| ドメイン | なし | Cloudflare は原価で売る (`.com` なら年 10〜11 ドル前後。TLD で違う) |
| Pages (静的ファイル) | 配信の回数・転送量は無制限。出すのは月500回まで | 月500回は普通の push では超えない |
| Pages Functions (API) | 1日 10万回 (Workers と共通) | Workers Paid (月5ドル) で月1000万回まで込み、以後100万回ごとに0.30ドル |
| D1 | 1日 読む行500万・書く行10万、保存5GB | Workers Paid で月 読む行250億・書く行5000万まで込み |
| AdSense / CMP | 無料 | — |

API を呼ぶのは、死亡記録を開いたとき (1回)、追悼館の一覧 (1ページ2回)、残す・ろうそく・報告 (各1回) だけです。プレイヤーが1日に数千人いても無料の範囲に収まる見込みです。D1 の「読む行」を食うのは一覧を深くめくったときなので、一覧の件数は数えきらず「次のページがあるか」までに抑えてあります。無料の上限を超えると、その日の残りは API が失敗 (ゲームは追悼館の案内に切り替わる) するだけで、勝手に課金はされません。
