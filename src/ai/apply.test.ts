import { describe, it, expect } from 'vitest';
import { parseJson } from './client';
import { clean, problem, sanitizeDeath, sanitizeYear, type Check } from './apply';
import { deathPrompt, speakers, yearPrompt } from './prompts';
import { createHero, liveOut, type Setup } from '../engine';

const KNOWN_JA = '世界: 剣と魔法の国\n主人公: アルリック・ベルハート(呼び名 アルリック)\nこの年の年齢: 15歳\n- 15歳で冒険者ギルドに入った。\n- 仲間のセリナとスライムを狩った。\nセリナ\nミラ';
const KNOWN_EN = 'World: Sword and Sorcery\nMain character: Alric Belheart (goes by Alric)\nAge this year: 15\n- Alric joined the Adventurers Guild at 15.\n- Hunted slimes with Selina.\nSelina\nMira';
const ja = (o: Partial<Check> = {}): Check => ({ known: KNOWN_JA, dead: ['ミラ'], death: false, en: false, ...o });
const en = (o: Partial<Check> = {}): Check => ({ known: KNOWN_EN, dead: ['Mira'], death: false, en: true, ...o });

describe('parseJson', () => {
  it('思考タグとコードフェンスの中から最初の JSON を取り出す', () => {
    expect(parseJson('<think>{"x":1}</think>\n```json\n{"text":"雨が降った。","n":"a}b"}\n```')).toEqual({ text: '雨が降った。', n: 'a}b' });
  });
  it('JSON がない・壊れている・閉じていないなら例外', () => {
    expect(() => parseJson('ごめんなさい')).toThrow();
    expect(() => parseJson('{"text": 雨}')).toThrow();
    expect(() => parseJson('{"text": "雨"')).toThrow();
  });
});

describe('clean', () => {
  it('HTML のタグを取り除き、文字だけにする', () => {
    expect(clean('<b>雨</b>が<script>alert(1)</script>降った。<img src=x onerror=y>', 100)).toBe('雨がalert(1)降った。');
    // 山括弧で囲まれた部分はタグとみなして中身ごと落とす (残すより安全)
    expect(clean('a < b > c', 100)).toBe('a c');
    expect(clean('a > b', 100)).toBe('a b');
  });
  it('制御文字と改行は空白にまとめる', () => {
    expect(clean('雨が\n\n降った。\u0007', 100)).toBe('雨が 降った。');
  });
  it('長すぎるものは切らずに捨てる。文字列でないもの・空も捨てる', () => {
    expect(clean('あ'.repeat(11), 10)).toBeNull();
    expect(clean('あ'.repeat(10), 10)).toBe('あ'.repeat(10));
    expect(clean(3, 10)).toBeNull();
    expect(clean('  ', 10)).toBeNull();
    expect(clean({ text: 'x' }, 10)).toBeNull();
  });
});

describe('problem (日本語)', () => {
  it('事実に沿った細部は通る', () => {
    expect(problem('ギルドの床は泥で汚れていて、セリナはパンを半分に割って差し出した。', ja())).toBeNull();
    expect(problem('アルリックは15歳の春、初めて剣を研いだ。', ja())).toBeNull();
  });
  it('かなを含まない文は言語違い', () => {
    expect(problem('Selina smiled.', ja())).toBe('lang');
    expect(problem('剣士', ja())).toBe('lang');
  });
  it('誰かを死なせる語は使わない', () => {
    for (const t of ['セリナが亡くなった。', '魔物に殺された。', 'その夜、セリナは息を引き取った。', '仲間が死んだ。', 'ゴブリンを殺した。']) expect(problem(t, ja())).toBe('death');
  });
  it('「必死に」のような語は死の語に数えない', () => {
    expect(problem('セリナは必死に走った。', ja())).toBeNull();
  });
  it('生き返らせる語は使わない (死亡記録でも)', () => {
    expect(problem('セリナが生き返った。', ja())).toBe('revive');
    expect(problem('アルリックはよみがえった。', ja({ death: true }))).toBe('revive');
  });
  it('この年より前に亡くなった人を出さない', () => {
    expect(problem('ミラと市場を歩いた。', ja())).toBe('dead-name');
  });
  it('渡していないカタカナの名前を出さない', () => {
    expect(problem('ガルドスという男が話しかけてきた。', ja())).toBe('name');
  });
  it('敬称の付いた、渡していない漢字の名前を出さない', () => {
    expect(problem('宿の源蔵さんが笑った。', ja())).toBe('name');
  });
  it('数字を書き換えない (渡していない数字・漢数字の年齢)', () => {
    expect(problem('アルリックは16歳になっていた。', ja())).toBe('number');
    expect(problem('アルリックは十六歳になっていた。', ja())).toBe('number');
    expect(problem('銀貨３００枚を稼いだ。', ja())).toBe('number');
  });
  it('死亡記録の言葉なら死の語は使ってよい', () => {
    expect(problem('アルリックが死んだなんて、まだ信じられない。', ja({ death: true }))).toBeNull();
  });
});

describe('problem (英語)', () => {
  it('事実に沿った細部は通る', () => {
    expect(problem('The guild floor was muddy. Selina tore her bread in half and handed it over.', en())).toBeNull();
    expect(problem('"Rest now, Alric," Selina said quietly.', en({ death: true }))).toBeNull();
  });
  it('かな・漢字を含むと言語違い', () => {
    expect(problem('Selina smiled at アルリック.', en())).toBe('lang');
  });
  it('誰かを死なせる語・生き返らせる語は使わない', () => {
    expect(problem('Selina died that winter.', en())).toBe('death');
    expect(problem('A goblin was killed at the gate.', en())).toBe('death');
    expect(problem('Alric was revived by a priest.', en({ death: true }))).toBe('revive');
  });
  it('この年より前に亡くなった人を出さない', () => {
    expect(problem('He walked the market with Mira.', en())).toBe('dead-name');
  });
  it('渡していない名前は文頭でも文中でも出さない', () => {
    expect(problem('A man named Gordo spoke to him.', en())).toBe('name');
    expect(problem('Gordo laughed at the joke.', en())).toBe('name');
  });
  it('呼びかけの Mother や文頭のよくある語は名前に数えない', () => {
    expect(problem('Mother, you were always kind. Thank you, Alric.', en({ death: true }))).toBeNull();
  });
  it('数字を書き換えない (渡していない数字・数の語)', () => {
    expect(problem('Alric turned 16 that spring.', en())).toBe('number');
    expect(problem('At sixteen years old, he left.', en())).toBe('number');
    expect(problem('He was aged twenty by then.', en())).toBe('number');
  });
});

describe('sanitizeYear', () => {
  it('通った文は ai 印つきの年表の1行になる', () => {
    expect(sanitizeYear({ text: '<i>ギルドの床</i>は泥で汚れていた。' }, ja(), 15, 'adventure'))
      .toEqual({ age: 15, text: 'ギルドの床は泥で汚れていた。', kind: 'adventure', ai: true });
  });
  it('形が違う・長すぎる・検査に落ちるものは null', () => {
    expect(sanitizeYear(null, ja(), 15, 'work')).toBeNull();
    expect(sanitizeYear([], ja(), 15, 'work')).toBeNull();
    expect(sanitizeYear({ text: 3 }, ja(), 15, 'work')).toBeNull();
    expect(sanitizeYear({ text: 'あ'.repeat(161) }, ja(), 15, 'work')).toBeNull();
    expect(sanitizeYear({ text: 'セリナが亡くなった。' }, ja(), 15, 'work')).toBeNull();
  });
  it('英語は長さの上限が広い', () => {
    const t = `${'The rain fell on the guild roof. '.repeat(12)}`.trim();
    expect(t.length).toBeGreaterThan(160);
    expect(sanitizeYear({ text: t }, en(), 15, 'work')?.text).toBe(t);
  });
});

describe('sanitizeDeath', () => {
  const who = [{ id: 7, name: 'セリナ' }, { id: 9, name: 'アルリック' }];
  it('頼んだ人の言葉だけ、1人1つ。墓碑銘は別に検める', () => {
    const d = sanitizeDeath({
      words: [
        { id: 7, text: 'スライムを狩った日のこと、忘れない。' },
        { id: 7, text: '二つ目の言葉。' },
        { id: 99, text: '知らない人の言葉。' },
        { id: '9', text: 'ガルドスによろしく。' },
      ],
      epitaph: 'ギルドの床を泥だらけにした人、ここに眠る',
    }, ja({ death: true }), who);
    expect(d.words).toEqual([{ id: 7, name: 'セリナ', text: 'スライムを狩った日のこと、忘れない。', ai: true }]);
    expect(d.epitaph).toBe('ギルドの床を泥だらけにした人、ここに眠る');
  });
  it('改行のある墓碑銘・長すぎる墓碑銘は使わない', () => {
    expect(sanitizeDeath({ epitaph: 'ここに\n眠る' }, ja({ death: true }), who).epitaph).toBeNull();
    expect(sanitizeDeath({ epitaph: 'あ'.repeat(41) }, ja({ death: true }), who).epitaph).toBeNull();
  });
  it('形が違っても落ちない', () => {
    expect(sanitizeDeath(null, ja({ death: true }), who)).toEqual({ words: [], epitaph: null });
    expect(sanitizeDeath({ words: 'x', epitaph: 5 }, ja({ death: true }), who)).toEqual({ words: [], epitaph: null });
  });
});

describe('prompts と検査の材料 (実際の人生で)', () => {
  const setup = (seed: number): Setup => ({ seed, world: { preset: 'medieval' }, hero: {}, auto: true });
  // 最後にそばにいた人がいて、それより前に亡くなった人もいる人生を探す
  const find = () => {
    for (let s = 1; s < 400; s++) {
      const h = liveOut(createHero(setup(s * 7919)));
      if (speakers(h).length && h.people.some((t) => !t.alive && t.diedAt! < h.age)) return h;
    }
    throw new Error('見つからなかった');
  };
  const h = find();

  it('年の頼みには、その年の出来事と世界の名が入り、故人は検査の材料に入る', () => {
    const age = h.log.find((e) => e.kind !== 'death' && e.age > 0)!.age;
    const ask = yearPrompt(h, age);
    const user = ask.msgs[1].content;
    for (const e of h.log.filter((x) => x.age === age && x.kind !== 'death')) expect(user).toContain(e.text);
    expect(user).toContain(h.world.name.ja);
    for (const t of h.people.filter((x) => !x.alive && x.diedAt! < age)) expect(ask.check.dead).toContain(t.name);
    expect(ask.check.death).toBe(false);
    expect(ask.check.known).toContain(h.given);
  });

  it('死の頼みには最後にそばにいた人が id つきで入り、その人の言葉は通る', () => {
    const ask = deathPrompt(h);
    const sp = speakers(h);
    for (const t of sp) expect(ask.msgs[1].content).toContain(`[id ${t.id}]`);
    expect(ask.check.death).toBe(true);
    const raw = { words: sp.map((t) => ({ id: t.id, text: `${h.given}、ありがとう。` })), epitaph: `${h.given}、ここに眠る` };
    const d = sanitizeDeath(raw, ask.check, sp);
    expect(d.words.map((w) => w.id)).toEqual(sp.map((t) => t.id));
    expect(d.epitaph).toBe(`${h.given}、ここに眠る`);
  });
});
