-- アカウント (ログインした人の記録を端末をまたいで残す)。残すのはログインの相手 (provider) とその中の番号 (sub) だけ。
-- メール・名前・写真は受け取っても残さない。provider は今は google だけ (あとで github などを足せる形)
CREATE TABLE IF NOT EXISTS account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  sub TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (provider, sub)
);

-- ログインの印。Cookie の値はそのまま残さず SHA-256 だけ。expires_at はミリ秒
CREATE TABLE IF NOT EXISTS session (
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS session_account ON session (account_id);

-- 遊びの積み重ね (src/meta/types.ts の Progress を JSON で)。rev は書くたびに1つ進む
CREATE TABLE IF NOT EXISTS progress (
  account_id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  rev INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
