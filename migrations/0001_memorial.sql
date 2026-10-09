-- 追悼館 (Cloudflare D1)。欄は server/server.mjs の memorial と同じに、非表示と報告の欄を足したもの
CREATE TABLE IF NOT EXISTS memorial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seed INTEGER NOT NULL,
  world TEXT NOT NULL,
  name TEXT NOT NULL,
  race TEXT NOT NULL,
  sex TEXT NOT NULL,
  status TEXT NOT NULL,
  age INTEGER NOT NULL,
  hazard TEXT NOT NULL,
  cause_label TEXT NOT NULL,
  cause_text TEXT NOT NULL,
  why TEXT NOT NULL DEFAULT '',
  highlights TEXT NOT NULL DEFAULT '[]',
  last_with TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  scene TEXT,
  lang TEXT NOT NULL DEFAULT 'ja',
  candles INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  gen INTEGER NOT NULL DEFAULT 1,
  lineage TEXT NOT NULL DEFAULT '[]',
  reports INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  UNIQUE (seed, world)
);
CREATE INDEX IF NOT EXISTS memorial_visible ON memorial (hidden, lang, id);

-- 報告: 同じ人 (IP の HMAC) は1件に1回だけ数える
CREATE TABLE IF NOT EXISTS report (
  memorial_id INTEGER NOT NULL,
  who TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (memorial_id, who)
);

-- 送信量の制限: 固定の時間窓ごとの回数。k = 種類:IPのHMAC:窓の番号、exp を過ぎた行は消す
CREATE TABLE IF NOT EXISTS rate (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  exp INTEGER NOT NULL
);
