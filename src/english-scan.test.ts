import { describe, it, expect, vi, beforeAll } from 'vitest';

// 調べるときだけ: SCAN_N=40 SCAN_DUMP=/tmp/x.tsv で、集めた文と網に掛かった文をファイルに書き出す
const ENV = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const dump = async (path: string, text: string) => {
  const fs = (await import(/* @vite-ignore */ `node:${'fs'}`)) as { writeFileSync: (p: string, s: string) => void };
  fs.writeFileSync(path, text);
};
// ソースの英語の側 (テストを除く)
const SOURCES = import.meta.glob<string>(['./**/*.ts', '!./**/*.test.ts'], { query: '?raw', import: 'default', eager: true });

// 英語の画面に出る文を集めて、日本語の文字の漏れと、英語の文法の崩れを探す (README / docs/GLOSSARY.md)。
// i18n.ts は読み込んだ時に言語を決めるので、保存先を英語にしてから読み込む
vi.stubGlobal('localStorage', { getItem: () => 'en', setItem: () => undefined });

// CJK: 漢字・かな・全角の記号 (「」〈〉。、・ など) と全角の英数
const CJK = /[　-〿぀-ヿ㐀-鿿＀-￯]/;

// 文法の網。どれも「英語の文にあってはいけない形」で、日本語の組み立ての癖や置き換えの継ぎ目から出る
const GRAMMAR: [string, RegExp][] = [
  ['double space', / {2}/],
  ['..', /(?<!\.)\.\.(?!\.)/],
  ['space before , . ; :', / [,.;:](?!\.)/],
  ['a + vowel', /\b[Aa] (?=[aeioAEIO])(?!one\b|once\b|uni|use|usu|euro)/],
  ['an + consonant', /\b[Aa]n (?=[bcdfgjklmnpqrstvwxyzBCDFGJKLMNPQRSTVWXYZ])(?!hour|heir|hon)/],
  ['1 + plural', /(?<![\d.,])\b1 (years|children|days|months|times|kids|sons|daughters|people|lives|souls|points|slots)\b/],
  ['n + singular', /(?<![\d.,-])\b(?:[02-9]|\d{2,}) (year|child|day|month|time|kid|son|daughter|life|soul|point|slot)\b(?![-'])/],
  ['lowercase start', /^[a-z]/],
  ['lowercase after period', /[.!?] [a-z]/],
  ['themself', /\bthemself\b/],
  ["space before 's", / 's\b/],
  ['empty slot', /\{[a-z]+\}|undefined|NaN|\[object/],
  ['article + article', /\b(?:a|an|the) (?:a|an|the)\b/i],
  ['doubled word', /\b(\w{3,}) \1\b/i],
  // 用語集 (docs/GLOSSARY.md) から外れた言い方
  ['glossary', /Demon King|reincarnated soul|soul from another world|\bthe gift\b|\bno gift\b|\b[Gg]ift: |Status window|stat screen|\brank [A-SF]\b|\bgrade [A-SF]\b|\btier [A-SF]\b/],
  ['curly apostrophe', /’/],
  ['ordinal suffix', /\b(?:\d*[02-9])?[123]th\b|\b\d*1[123](?:st|nd|rd)\b/],
];

interface Item { src: string; text: string }

async function collect(perWorld: number): Promise<Item[]> {
  vi.resetModules();
  const out: Item[] = [];
  const add = (src: string, text: string | undefined | null) => { if (text) out.push({ src, text }); };
  const E = await import('./engine');
  const { chronicleOf } = await import('./engine/chronicle');
  const { reincarnatorsOf, reincarnatorLife, deedLine } = await import('./engine/reincarnators');
  const { fateLine, profileLines } = await import('./engine/people');
  const L = await import('./ui/labels');
  const { effectText, TRAIT_KIND_NAME } = await import('./ui/build');
  const { yearPrompt, deathPrompt } = await import('./ai/prompts');

  // 設定の画面: 世界・種族・身分・才能・特典・trait・職業・ラベル
  for (const w of E.WORLD_IDS) {
    const world = E.WORLDS[w];
    add('world', world.name.en);
    for (const s of E.STATUSES) add('status', E.statusName(s, world));
  }
  for (const r of E.RACE_IDS) add('race', E.RACES[r].name.en);
  for (const c of E.CHEAT_IDS) { add('cheat', E.CHEATS[c].name.en); add('cheat', E.CHEATS[c].desc.en); }
  for (const t of E.allTraits()) { add('trait', t.name.en); add('trait', t.desc.en); add('effect', effectText(t)); }
  for (const j of Object.values(E.JOBS)) add('job', j.en);
  for (const rec of [L.TALENT_NAME, L.ARRIVAL_NAME, L.MEMORY_NAME, L.POLICY_NAME, L.SEX_NAME, L.STAT_NAME, L.ROLE_NAME, L.KIND_NAME, L.PAST_CAUSE_NAME, TRAIT_KIND_NAME]) {
    for (const v of Object.values(rec)) add('label', v);
  }
  for (let i = 0; i < 40; i++) add('pastEnd', L.pastEnd('unknown', true, i).text);
  for (const k of E.HAZARDS) add('hazard', E.hazardName(k));

  // 一生: 全世界で perWorld 人ずつ
  for (const w of E.WORLD_IDS) {
    for (let s = 1; s <= perWorld; s++) {
      const h = E.liveOut(E.createHero({ seed: s * 7919 + w.length, world: { preset: w }, hero: {}, auto: true }), 1500);
      const tag = `${w}#${s}`;
      add(`name ${tag}`, h.name);
      add(`death ${tag}`, h.death?.label);
      add(`death ${tag}`, h.death?.text);
      for (const e of h.log) { add(`log ${tag}`, e.text); add(`why ${tag}`, e.why); }
      for (const r of E.riskBreakdown(h)) { add(`risk ${tag}`, r.label); r.notes.forEach((n) => add(`risk ${tag}`, n)); }
      for (const t of h.people) {
        add(`person ${tag}`, t.name);
        add(`fate ${tag}`, fateLine(h, t));
        for (const p of profileLines(h, t)) { add(`profile ${tag}`, p.label); add(`profile ${tag}`, p.value); }
        for (const st of t.profile?.story ?? []) add(`story ${tag}`, st.text);
      }
      for (const t of h.people.slice(0, 3)) {
        const o = E.lifeOfTie(h, t.id);
        for (const e of o.log) { add(`other ${tag}`, e.text); add(`other-why ${tag}`, e.why); }
        add(`other-death ${tag}`, o.death?.text);
      }
      for (const e of chronicleOf(h)) add(`chronicle ${tag}`, e.text);
      for (const p of reincarnatorsOf(h)) {
        add(`reinc ${tag}`, p.name);
        add(`reinc ${tag}`, deedLine(h, p));
        if (p.id <= 2) for (const e of reincarnatorLife(h, p.id).log) add(`reinc-life ${tag}`, e.text);
      }
      if (s === 1) {
        for (const m of [...yearPrompt(h, h.age - 1).msgs, ...deathPrompt(h).msgs]) add(`ai ${tag}`, m.content);
      }
    }
  }
  // 選択肢: 自動にせず、出てきた問いと選択肢を拾いながら進める
  for (const w of E.WORLD_IDS) {
    for (let s = 1; s <= Math.ceil(perWorld / 2); s++) {
      const h = E.createHero({ seed: s * 104729 + w.length, world: { preset: w }, hero: {} });
      for (let i = 0; i < 400 && h.alive; i++) {
        E.advanceYear(h);
        while (h.pending.length && h.alive) {
          const d = h.pending[0];
          add(`choice ${w}#${s}`, d.title); add(`choice ${w}#${s}`, d.text);
          for (const o of d.options) { add(`choice ${w}#${s}`, o.label); add(`choice ${w}#${s}`, o.hint); }
          E.choose(h, d.auto(h));
        }
      }
      for (const e of h.log) add(`log ${w}#c${s}`, e.text);
    }
  }
  // 試行: 死因の名前
  for (const w of E.WORLD_IDS) {
    const r = E.runTrials({ seed: 1, world: { preset: w }, hero: {}, auto: true }, 30);
    for (const c of r.topCauses) add(`trial ${w}`, c.label);
  }
  return out;
}

// 画面の文 (src/ui, src/ai, engine の L() と en:) を、ソースから直接見る。動かして出しにくい画面のラベル用
// ソースの文字列リテラル ('…' / "…" / `…${…}…` を1段の入れ子まで)
const STR = String.raw`(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\$]|\\.|\$(?!\{)|\$\{(?:[^{}\`'"]|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)*\})*\`)`;

function sourceEnglish(): Item[] {
  const out: Item[] = [];
  const pair = new RegExp(String.raw`\bL\(\s*${STR}\s*,\s*(${STR})`, 'g');
  const prop = new RegExp(String.raw`\ben:\s*(${STR})`, 'g');
  // [日本語, 英語] の組 (前が日本語のときだけ)
  const tuple = new RegExp(String.raw`\[\s*(${STR})\s*,\s*(${STR})`, 'g');
  for (const [f, raw] of Object.entries(SOURCES)) {
    const src = raw.replace(/^\s*\/\/.*$/gm, '');
    const push = (t: string) => out.push({ src: f, text: t.slice(1, -1).replace(/\$\{[^}]*\}/g, 'X') });
    for (const re of [pair, prop]) for (const m of src.matchAll(re)) push(m[1]);
    for (const m of src.matchAll(tuple)) if (CJK.test(m[1])) push(m[2]);
  }
  return out;
}

// 画面のコード (ui / ai / net / main) で、日本語の側 (L と W の1つ目・ja:・[日本語, 英語] の1つ目・*_JA の定数・正規表現) の外に CJK が無いか。
// 〈特典の名〉を英語でもそのまま出す、のような漏れを拾う
function uiLeaks(): string[] {
  const jaArg = new RegExp(String.raw`\b([LW])\((?:${STR}|[^,()'"\`])*,`, 'g'); // 1つ目の引数 (条件式の中の文字列も含む)
  const jaProp = new RegExp(String.raw`\bja:\s*${STR}`, 'g');
  const jaTuple = new RegExp(String.raw`\[\s*${STR}(?=\s*,)`, 'g');
  const jaMid = new RegExp(String.raw`,\s*${STR}(?=\s*,\s*${STR}\s*\])`, 'g'); // [id, 日本語, 英語] の真ん中
  const out: string[] = [];
  for (const [f, raw] of Object.entries(SOURCES)) {
    if (!/^\.\/(?:ui|ai|net)\/|^\.\/main\.ts$/.test(f)) continue;
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/const\s+\w*(?:_JA|KATA_OK)\b[\s\S]*?;\s*$/gm, '')
      .replace(jaArg, '$1(JA,').replace(jaProp, 'ja: JA').replace(jaTuple, (m) => (CJK.test(m) ? '[JA' : m)).replace(jaMid, (m) => (CJK.test(m) ? ', JA' : m));
    src.split('\n').forEach((line, i) => {
      if (/data-lang="ja"/.test(line)) return; // 言語の切り替えのボタンは、英語の画面でも「日本語」と書く
      if (/\/[^/\n]*[\u3000-\u303f\u3040-\u30ff\u4e00-\u9fff][^/\n]*\/[gimsuy]*[,;)\s.]/.test(line)) return;
      if (CJK.test(line)) out.push(`${f}:${i + 1}: ${line.trim().slice(0, 140)}`);
    });
  }
  return out;
}

const cjkOf = (items: Item[]) => items.filter((i) => CJK.test(i.text));
const grammarOf = (items: Item[]) => {
  const by: Record<string, string[]> = {};
  for (const it of items) {
    if (/^ai /.test(it.src)) continue; // 頼む文は改行と箇条書きの形なので文法の網に掛けない (CJK だけ見る)
    for (const sentence of it.text.split('\n')) for (const [k, re] of GRAMMAR) if (re.test(sentence)) (by[k] ??= []).push(`${it.src}: ${sentence}`);
  }
  return by;
};

describe('英語の画面に日本語と文法の崩れが無い', () => {
  let items: Item[] = [];
  beforeAll(async () => {
    items = await collect(Number(ENV.SCAN_N ?? 12));
    if (ENV.SCAN_DUMP) await dump(ENV.SCAN_DUMP, items.map((i) => `${i.src}\t${i.text.replace(/\n/g, ' ⏎ ')}`).join('\n'));
  }, 60_000);

  it('代名詞と魔物の複数形の置き換えは、性別と数に合う', async () => {
    const E = await import('./engine');
    const { fill } = await import('./engine/events');
    const { plural } = await import('./engine/names');
    const she = E.createHero({ seed: 5, world: { preset: 'medieval' }, hero: { sex: 'F', arrival: 'native', status: 'commoner' }, auto: true });
    const he = E.createHero({ seed: 5, world: { preset: 'medieval' }, hero: { sex: 'M', arrival: 'native', status: 'commoner' }, auto: true });
    expect(fill('{He} lost {his} way and found {himself} alone. Mother called {him}.', she)).toBe('She lost her way and found herself alone. Mother called her.');
    expect(fill('{He} lost {his} way and found {himself} alone. Mother called {him}.', he)).toBe('He lost his way and found himself alone. Mother called him.');
    expect(fill('{His:mother} hands were cold. {he:mother}', she)).toBe('Her hands were cold. she');
    expect(fill('{his:mentor}', she)).toBe('their'); // その役の人がいなければ they
    expect(['giant spider', 'dire wolf', 'harpy', 'kraken', 'rad rat', 'fire djinn'].map(plural)).toEqual(['giant spiders', 'dire wolves', 'harpies', 'kraken', 'rad rats', 'fire djinn']);
  });

  it('集めた文は十分に多い (全世界・全画面)', () => {
    expect(items.length).toBeGreaterThan(5000);
    for (const k of ['world', 'race', 'cheat', 'trait', 'effect', 'job', 'label', 'log', 'fate', 'profile', 'chronicle', 'reinc', 'other', 'ai', 'choice', 'trial']) {
      expect(items.some((i) => i.src.startsWith(k)), k).toBe(true);
    }
  });

  it('動かして出た文に CJK の文字が無い', () => {
    expect(cjkOf(items).slice(0, 10).map((i) => `${i.src}: ${i.text.slice(0, 160)}`)).toEqual([]);
  });

  it('ソースの英語の側に CJK の文字が無い', () => {
    const src = sourceEnglish();
    expect(src.length).toBeGreaterThan(3500);
    expect(cjkOf(src).slice(0, 10).map((i) => `${i.src}: ${i.text.slice(0, 160)}`)).toEqual([]);
  });

  it('画面のコードに、日本語の側の外の CJK が無い (英語でも出てしまう文字)', () => {
    expect(uiLeaks().slice(0, 10)).toEqual([]);
  });

  it('文法の網に掛かる文が無い', async () => {
    const by = grammarOf(items);
    if (ENV.SCAN_DUMP) await dump(`${ENV.SCAN_DUMP}.grammar`, Object.entries(by).map(([k, v]) => `## ${k} (${v.length})\n${[...new Set(v)].join('\n')}`).join('\n\n'));
    expect(Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.slice(0, 3)]))).toEqual({});
  });
});
