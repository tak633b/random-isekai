import { describe, it, expect, afterEach } from 'vitest';
import { allDeaths, allEvents, applyEvent, candidates, deathRecord, fill, useData } from './events';
import { createHero } from './hero';
import { advanceYear, choose, die, fromSaved, liveOut, toSaved } from './life';
import { hazardName } from './why';
import { worldNames } from './names';
import type { DeathDef, EventDef, Hero } from './types';

const ORIGINAL = { events: allEvents(), deaths: allDeaths() };
afterEach(() => useData(ORIGINAL));

const hero = (auto = true): Hero =>
  createHero({ seed: 5, world: { preset: 'medieval' }, hero: { race: 'human', status: 'commoner', cheat: 'none', arrival: 'native', sex: 'F' }, auto });

const ev = (over: Partial<EventDef>): EventDef => ({ id: 't.x', stage: ['infant', 'child', 'teen', 'adult', 'middle', 'elder'], w: 1, kind: 'family', ja: '{name}', en: '{name}', ...over });

describe('データが空でも動く', () => {
  it('出来事も死因の文も0件で、一生を最後まで進められる', () => {
    useData({ events: [], deaths: [] });
    for (let s = 1; s <= 200; s++) {
      const h = liveOut(createHero({ seed: s, world: { preset: 'random' }, hero: {}, auto: true }));
      expect(h.alive).toBe(false);
      // 死因の文が無いときは分類名だけの文になる
      expect(h.death!.id).toBe(h.death!.hazard);
      expect(h.death!.label).toBe(hazardName(h.death!.hazard));
    }
  });
  it('選択を待たない1年進めも壊れない', () => {
    useData({ events: [], deaths: [] });
    const h = hero(false);
    for (let i = 0; i < 30 && h.alive; i++) { advanceYear(h); while (h.pending.length) choose(h, 0); }
    expect(h.age).toBeGreaterThan(0);
  });
});

describe('条件と置き換え', () => {
  it('{name} {town} {god} {age} を埋める', () => {
    const h = hero();
    const n = worldNames(h);
    expect(fill('{name}|{town}|{god}|{guild}|{lord}|{age}', h)).toBe(`${h.given}|${n.town}|${n.god}|${n.guild}|${n.lord}|0`);
    expect(fill('{beast}', h)).not.toMatch(/[{}]/);
  });

  it('輪の人を使う出来事は、その役の人がいるときだけ起きる (tie.new なら新しく作る)', () => {
    const needs = ev({ id: 't.friend', ja: '{friend}と遊んだ', en: 'played with {friend}' });
    const makes = ev({ id: 't.new-friend', ja: '{friend}と出会った', en: 'met {friend}', tie: { role: 'friend', new: true, d: 5 } });
    useData({ events: [needs, makes] });
    const h = hero();
    expect(candidates(h).map((d) => d.id)).toEqual(['t.new-friend']);
    applyEvent(h, makes, die);
    const friend = h.people.find((t) => t.role === 'friend')!;
    expect(h.log.at(-1)!.text).toBe(`${friend.name}と出会った`);
    expect(friend.bond).toBe(55);
    expect(friend.mem.length).toBe(1);
    // 一度きりの出来事はもう起きない。友だちができたので、もう一方が起きうる
    expect(candidates(h).map((d) => d.id)).toEqual(['t.friend']);
  });

  it('世界・段階・しるしで絞る', () => {
    useData({ events: [
      ev({ id: 't.scifi', tags: ['scifi'] }),
      ev({ id: 't.adult', stage: ['adult'] }),
      ev({ id: 't.flag', flag: 'guild' }),
      ev({ id: 't.ok', noFlag: 'guild' }),
    ] });
    expect(candidates(hero()).map((d) => d.id)).toEqual(['t.ok']);
  });

  it('その年の危険 (risk) で亡くなり、死因の文は条件と {age} で選ぶ', () => {
    const deaths: DeathDef[] = [
      { id: 'd.scifi', hazard: 'monster', tags: ['scifi'], w: 1, label: { ja: '宇宙', en: 'space' }, ja: 'x', en: 'x' },
      { id: 'd.ok', hazard: 'monster', w: 1, label: { ja: '魔物', en: 'monster' }, ja: '{age}歳、{name}は魔物に倒れた。', en: '{name} fell at {age}.' },
    ];
    useData({ events: [ev({ id: 't.deadly', risk: { hazard: 'monster', p: 1 } })], deaths });
    const h = hero();
    applyEvent(h, allEvents()[0], die);
    expect(h.alive).toBe(false);
    expect(h.death!.id).toBe('d.ok');
    expect(h.death!.text).toBe(`0歳、${h.given}は魔物に倒れた。`);
    expect(h.log.at(-1)!.hazard).toBe('monster');
    expect(h.log.at(-1)!.why).toBeTruthy();
    expect(deathRecord(h, 'disease').id).toBe('disease'); // 合う文が無い分類
  });
});

describe('実年齢の条件 (age)', () => {
  it('エルフは人間換算で十数年「乳幼児」だが、誕生の出来事は0歳にしか起きない', () => {
    const born = ev({ id: 't.born', stage: ['infant'], age: [0, 0], ja: '{name}が生まれた', en: '{name} was born' });
    const baby = ev({ id: 't.baby', stage: ['infant'] });
    useData({ events: [born, baby] });
    const h = createHero({ seed: 5, world: { preset: 'medieval' }, hero: { race: 'elf', status: 'commoner', cheat: 'none', arrival: 'native' }, auto: true });
    expect(candidates(h).map((d) => d.id)).toEqual(['t.born', 't.baby']);
    h.age = 16; // 人間換算 2.56歳 = まだ乳幼児
    expect(candidates(h).map((d) => d.id)).toEqual(['t.baby']);
    // 一生を通しても、0歳より後に誕生の出来事は出ない
    for (let s = 1; s <= 100; s++) {
      const e = liveOut(createHero({ seed: s, world: { preset: 'medieval' }, hero: { race: 'elf', arrival: 'native' }, auto: true }));
      for (const x of e.log) if (x.text === `${e.given}が生まれた`) expect(x.age).toBe(0);
    }
  });
});

describe('繰り返しと穴埋め', () => {
  it('何度も起きる出来事でも、同じものは5年あける', () => {
    const fest = ev({ id: 't.fest', repeat: true });
    useData({ events: [fest] });
    const h = hero();
    h.age = 4;
    applyEvent(h, fest, die);
    const ok = (age: number) => { h.age = age; return candidates(h).length === 1; };
    expect([5, 6, 7, 8, 9].map(ok)).toEqual([false, false, false, false, true]);
  });

  it('穴埋めの一文 (alone) は、その年にほかの記録があれば起きない', () => {
    const quiet = ev({ id: 't.quiet', repeat: true, alone: true });
    useData({ events: [quiet] });
    const h = hero();
    h.age = 3;
    expect(candidates(h).length).toBe(1);
    h.log.push({ age: 3, text: '母が亡くなった。', kind: 'loss' });
    expect(candidates(h).length).toBe(0);
  });
});

describe('和風と仙侠を書き分ける', () => {
  it('和風の人生に霊根・宗門は出ず、仙侠の人生に元服・侍は出ない', () => {
    const texts = (preset: 'wa' | 'xianxia') => {
      const out: string[] = [];
      for (let s = 1; s <= 150; s++) out.push(...liveOut(createHero({ seed: s, world: { preset }, hero: {}, auto: true })).log.map((e) => e.text));
      return out.join('\n');
    };
    expect(texts('wa')).not.toMatch(/霊根|測霊石|宗門|築基|金丹|科挙|後宮/);
    expect(texts('xianxia')).not.toMatch(/元服|寺の手習い|陰陽|河童|天狗|筵旗|浪人/);
  }, 30_000);
});

describe('親と伴侶', () => {
  const ill = ev({ id: 't.mother-ill', ja: '{mother}が病に伏せた', en: '{mother} fell ill', tie: { role: 'mother', d: 6 } });
  const visit = ev({ id: 't.father-visit', ja: '父と食事をした', en: 'ate with Father', tie: { role: 'father', d: 3 } });

  it('{mother} は「母」と続柄で出て、母が生きているときだけ起きる', () => {
    useData({ events: [ill, visit] });
    const h = hero();
    expect(candidates(h).map((d) => d.id)).toEqual(['t.mother-ill', 't.father-visit']);
    expect(fill('{mother}と{father}', h)).toBe('母と父');
    for (const t of h.people) if (t.role === 'mother') { t.alive = false; t.diedAt = 0; }
    expect(candidates(h).map((d) => d.id)).toEqual(['t.father-visit']); // 文に {father} が無くても、tie で触れる人が要る
  });

  it('孤児には親の出来事が起きない', () => {
    useData({ events: [ill, visit] });
    const h = createHero({ seed: 5, world: { preset: 'medieval' }, hero: { race: 'human', status: 'orphan', cheat: 'none', arrival: 'native' }, auto: true });
    expect(candidates(h)).toEqual([]);
  });

  it('tie.dies の出来事で伴侶が亡くなり、未亡人のしるしが立つ', () => {
    const wed = ev({ id: 't.wed', ja: '{spouse}と結婚した', en: 'married {spouse}', set: 'married', tie: { role: 'spouse', new: true, d: 30 } });
    const widowed = ev({ id: 't.widowed', ja: '{spouse}が亡くなった', en: '{spouse} died', flag: 'married', tie: { role: 'spouse', d: 0, dies: true } });
    const h = hero();
    applyEvent(h, wed, die);
    const sp = h.people.find((t) => t.role === 'spouse')!;
    h.age = 40;
    applyEvent(h, widowed, die);
    expect(sp.alive).toBe(false);
    expect(sp.diedAt).toBe(40);
    expect(h.flags.married).toBeUndefined();
    expect(h.flags.widowed).toBe(40);
  });
});

describe('職業の変化を語る出来事', () => {
  it('勇者・聖女・騎士・領主のしるしで職業も変わる (job を書いた出来事はその職業に)', () => {
    const h = hero();
    h.age = 25; h.job = 'farmer';
    applyEvent(h, ev({ id: 't.hero', set: 'hero' }), die);
    expect(h.job).toBe('hero');
    applyEvent(h, ev({ id: 't.lord', set: 'lord' }), die);
    expect(h.job).toBe('lord');
    applyEvent(h, ev({ id: 't.apprentice', job: 'smith' }), die);
    expect(h.job).toBe('smith');
  });
  it('本物のデータで「勇者として名を呼ばれた」人生は、職業が勇者か勇者のしるしが立つ', () => {
    let seen = 0;
    for (let s = 1; s <= 3000 && seen < 5; s++) {
      const h = createHero({ seed: s, world: { preset: 'game' }, hero: { race: 'human' }, auto: true });
      while (h.alive && h.age < 60) {
        advanceYear(h);
        const e = h.log.find((x) => x.age === h.age && /勇者として名を呼ばれた|勇者に選ばれ/.test(x.text));
        if (e) { seen++; expect(h.job === 'hero' || h.flags.hero !== undefined).toBe(true); expect(h.job).toBe('hero'); break; }
      }
    }
    expect(seen).toBeGreaterThan(0);
  }, 60_000);
});

describe('選択肢', () => {
  const choice = ev({
    id: 't.choice', ja: '分かれ道', en: 'a fork',
    choice: { ja: 'どうする？', en: 'What now?', options: [
      { ja: '危ない道', en: 'risky', risk: { hazard: 'accident', p: 0.5 }, eff: { wealth: 20 } },
      { ja: '安全な道', en: 'safe', set: 'safe', log: { ja: '遠回りした', en: 'went the long way' } },
    ] },
  });

  it('自動でない人生では pending に積み、選ぶと効果が出る', () => {
    useData({ events: [choice] });
    const h = hero(false);
    const d = applyEvent(h, choice, die)!;
    expect(d.options.map((o) => o.label)).toEqual(['危ない道', '安全な道']);
    expect(d.options[0].hint).toBeTruthy();
    expect(d.ref).toBe('ev:t.choice');
    h.pending.push(d);
    choose(h, 1);
    expect(h.flags.safe).toBe(0);
    expect(h.log.at(-1)!.text).toBe('遠回りした');
  });

  it('慎重な人は危険の小さい方、無謀な人は大きい方を選ぶ', () => {
    const h = hero();
    const d = applyEvent(h, choice, die)!;
    h.policy = 'careful';
    expect(d.auto(h)).toBe(1);
    h.policy = 'bold';
    expect(d.auto(h)).toBe(0);
  });

  it('待っている選択は保存して戻せる', () => {
    useData({ events: [choice] });
    const h = hero(false);
    h.pending.push(applyEvent(h, choice, die)!);
    const back = fromSaved(JSON.parse(JSON.stringify(toSaved(h))));
    expect(back.pending.length).toBe(1);
    choose(back, 1);
    expect(back.flags.safe).toBe(0);
  });
});
