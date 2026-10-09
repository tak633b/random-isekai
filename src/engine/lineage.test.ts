import { describe, it, expect } from 'vitest';
import { createHero } from './hero';
import { advanceYear, fromSaved, liveOut, toSaved } from './life';
import { lifeOfTie } from './others';
import { chronicleOf } from './chronicle';
import { reincarnatorsOf } from './reincarnators';
import { continueAs, heirsOf, lineageOf } from './lineage';
import type { Hero, Role } from './types';

// 跡を継ぐ人: 子 > 連れ合い > きょうだい > そのほか (同じ順なら id の小さい人)
const ORDER: Role[] = ['child', 'spouse', 'sibling', 'disciple', 'companion', 'friend'];
function heir(h: Hero): string | undefined {
  const keys = heirsOf(h);
  const rank = (k: string) => { const t = h.people.find((x) => `t:${x.id}` === k)!; const i = ORDER.indexOf(t.role); return i < 0 ? 99 : i; };
  return [...keys].sort((a, b) => rank(a) - rank(b) || Number(a.slice(2)) - Number(b.slice(2)))[0];
}

// 3世代の人生 (最初の主人公 → 選んだ人 → その人が選んだ人)
function generations(seed: number): { lives: Hero[]; keys: string[] } {
  const lives = [liveOut(createHero({ seed, world: { preset: 'medieval' }, hero: {}, auto: true }))];
  const keys: string[] = [];
  for (let g = 0; g < 2; g++) {
    const prev = lives[lives.length - 1];
    const k = heir(prev);
    if (!k) break;
    keys.push(k);
    lives.push(liveOut(continueAs(prev, k)));
  }
  return { lives, keys };
}

const runs = Array.from({ length: 12 }, (_, i) => generations((i + 1) * 7919)).filter((r) => r.lives.length === 3);

describe('続けて遊ぶ (3世代)', () => {
  it('3世代まで続く人生が十分ある', () => { expect(runs.length).toBeGreaterThan(5); });

  it('新しい主人公の過去は、前の主人公から見たその人の一生 (lifeOfTie) のその年までと同じ', () => {
    for (const { lives, keys } of runs) for (let g = 1; g < 3; g++) {
      const prev = lives[g - 1], h = lives[g];
      const o = lifeOfTie(prev, Number(keys[g - 1].slice(2)));
      const until = prev.age - (h.lineage!.offset - (prev.lineage?.offset ?? 0)); // 前の主人公が亡くなった年のその人の年齢
      const a = h.log.filter((e) => e.age < until).map((e) => e.text);
      const b = o.log.filter((e) => e.age < until).map((e) => e.text);
      expect(a).toEqual(b);
      // 続けて遊び始めた年齢 = 前の主人公が亡くなった翌年のその人の年齢
      expect(h.lineage!.startAge).toBe(until + 1);
      expect(h.log.some((e) => e.age >= h.lineage!.startAge)).toBe(true);
    }
  });

  it('前の主人公は、選んだ人の輪に故人として正しい役でいる', () => {
    const want: Partial<Record<Role, Role[]>> = { child: ['mother', 'father'], spouse: ['spouse'], sibling: ['sibling'], disciple: ['mentor'], companion: ['companion'], friend: ['friend'] };
    for (const { lives, keys } of runs) for (let g = 1; g < 3; g++) {
      const prev = lives[g - 1], h = lives[g];
      const role = prev.people.find((t) => `t:${t.id}` === keys[g - 1])!.role;
      const p = h.people.find((t) => t.name === prev.given && !t.alive);
      expect(p, `${prev.given}`).toBeTruthy();
      if (want[role]) expect(want[role]).toContain(p!.role);
    }
  });

  it('年代記は世代をまたいで年の順に続き、前の代の死と手柄を含む。転生者の名簿は同じ人たち', () => {
    for (const { lives } of runs) {
      const last = lives[2];
      const chron = chronicleOf(last);
      for (let i = 1; i < chron.length; i++) expect(chron[i].at).toBeGreaterThanOrEqual(chron[i - 1].at);
      for (const a of last.lineage!.ancestors) {
        expect(chron.some((e) => e.text.includes(a.given) && e.at === a.diedAt - last.lineage!.offset)).toBe(true);
        for (const d of a.deeds ?? []) expect(chron.some((e) => e.text === d.text)).toBe(true);
      }
      const names = (h: Hero) => reincarnatorsOf(h).map((p) => p.name);
      expect(names(lives[1])).toEqual(names(lives[0]));
      expect(names(lives[2])).toEqual(names(lives[0]));
      // 名簿の生まれの年は、それぞれの主人公の年齢で同じ年を指す
      const r0 = reincarnatorsOf(lives[0]), r2 = reincarnatorsOf(last);
      r0.forEach((p, i) => expect(r2[i].bornAt + last.lineage!.offset).toBe(p.bornAt));
      expect(lineageOf(last).map((e) => e.gen)).toEqual([1, 2, 3]);
    }
  });

  it('同じ入力なら同じ。続けた人生を途中で保存して再開しても同じ', () => {
    for (const { lives, keys } of runs.slice(0, 4)) {
      const again = continueAs(lives[0], keys[0]);
      const b = continueAs(liveOut(createHero(lives[0].setup)), keys[0]); // 最初の主人公から作り直しても同じ
      const a = again;
      for (let i = 0; i < 15 && a.alive; i++) advanceYear(a);
      const restored = fromSaved(JSON.parse(JSON.stringify(toSaved(a))));
      liveOut(a); liveOut(restored); liveOut(b);
      expect(restored.log).toEqual(a.log);
      expect(b.log).toEqual(lives[1].log);
      expect(a.log).toEqual(lives[1].log);
    }
  });
});
