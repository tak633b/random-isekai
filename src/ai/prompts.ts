// AI に渡す文章。骨格 (生死・出来事・職業・人の輪) はコードが決めた事実として渡し、細部の肉付けだけを頼む。
// 頼むたびに、apply.ts の検査に使う材料 (渡した事実の全文・名前・故人) を一緒に返す。
import { CHEATS, JOBS, RACES, closest, statusName, summary } from '../engine';
import type { Hero, Role, Tie } from '../engine';
import { isEn, T } from '../i18n';
import type { Msg } from './client';
import type { Check } from './apply';

const RULES_JA = `あなたは異世界転生の人生シミュレーション「Random Isekai」の語り手です。
- 渡された事実に矛盾することを書かない。誰が生きていて誰が亡くなったかは変えない。誰も死なせない・生き返らせない。
- 人の名前は渡した名前だけを使う。新しい名前の人物を出さない(名もない通りすがりは「旅人」「店主」のように呼ぶ)。
- 年齢・年数・金額などの数字を書かない。
- その世界の様子に即した、具体的で小さな細部を書く。紋切り型の言い回しを避ける。
- 日本語。常体の過去形(〜た。)で短く。感嘆符・絵文字・記号の飾り・HTMLを使わない。
- 出力は JSON だけ。前置きや説明は書かない。`;

const RULES_EN = `You are the narrator of "Random Isekai", a simulator of lives reborn in other worlds.
- Never contradict the facts given. Do not change who is alive or dead. Do not kill anyone or bring anyone back to life.
- Use only the names given. Do not introduce new named characters (call unnamed strangers "a traveler", "the shopkeeper" and so on).
- Do not write numbers: no ages, years or amounts.
- Write small, concrete details true to that world. Avoid clichés.
- English. Past tense, short and plain. No exclamation marks, emoji, decorative symbols or HTML.
- Output JSON only. No preamble or explanation.`;

const ROLE: Record<Role, [string, string]> = {
  mother: ['母', 'mother'], father: ['父', 'father'], sibling: ['きょうだい', 'sibling'], spouse: ['連れ合い', 'spouse'],
  child: ['子', 'child'], lover: ['恋人', 'lover'], fiance: ['婚約者', 'fiancé(e)'], friend: ['友', 'friend'],
  companion: ['仲間', 'companion'], mentor: ['師', 'mentor'], rival: ['好敵手', 'rival'], nemesis: ['宿敵', 'nemesis'],
  familiar: ['従魔', 'familiar'], master: ['主人', 'master'], servant: ['従者', 'servant'], disciple: ['弟子', 'disciple'],
};
const W = (ja: string, en: string) => (isEn ? en : ja);
const roleName = (r: Role) => W(...ROLE[r]);
const sexName = (h: { sex: 'F' | 'M' }) => W(h.sex === 'F' ? '女' : '男', h.sex === 'F' ? 'female' : 'male');

function worldLines(h: Hero, now: boolean): string[] {
  const w = h.world;
  const out = [W(`世界: ${T(w.name)}(技術 ${w.tech}/10・魔法 ${w.magic}/3・危険 ${w.danger}/10)`, `World: ${T(w.name)} (technology ${w.tech}/10, magic ${w.magic}/3, danger ${w.danger}/10)`)];
  if (!now) return out;
  const s = h.state;
  const st = [s.war > 0 && W('戦争が続いている', 'a war is on'), s.plague > 0 && W('疫病が広がっている', 'a plague is spreading'),
    s.famine > 0 && W('飢饉', 'famine'), s.demonKing && W('魔王が健在', 'the Demon King still reigns')].filter(Boolean);
  out.push(W(`今の世の中: ${st.join('・') || '平穏'}`, `The world now: ${st.join(', ') || 'peaceful'}`));
  return out;
}

function heroLines(h: Hero, age: number): string[] {
  const now = age === h.age;
  const job = h.job ? W(JOBS[h.job].ja, JOBS[h.job].en) : W('なし', 'none');
  const cheat = h.cheat ? T(CHEATS[h.cheat].name) : W('なし', 'none');
  const out = [W(`主人公: ${h.name}(呼び名 ${h.given})・${sexName(h)}・${T(RACES[h.race].name)}・生まれ ${statusName(h.status, h.world)}・転生特典 ${cheat}`,
    `Main character: ${h.name} (goes by ${h.given}), ${sexName(h)}, ${T(RACES[h.race].name)}, born ${statusName(h.status, h.world)}, gift: ${cheat}`)];
  out.push(W(`この年の年齢: ${age}歳`, `Age this year: ${age}`));
  if (now) {
    const s = h.stats;
    out.push(W(`仕事: ${job}・状態(0-100): 健康 ${Math.round(s.hp)}・強さ ${Math.round(s.power)}・幸せ ${Math.round(s.happy)}・暮らし向き ${Math.round(s.wealth)}・名声 ${Math.round(s.fame)}`,
      `Work: ${job}. State (0-100): health ${Math.round(s.hp)}, power ${Math.round(s.power)}, happiness ${Math.round(s.happy)}, wealth ${Math.round(s.wealth)}, fame ${Math.round(s.fame)}`));
  }
  return out;
}

function personLine(t: Tie, age: number, mem = 0): string {
  const state = !t.alive && t.diedAt !== undefined && t.diedAt <= age ? W(t.diedAt === age ? 'この年に亡くなった' : '故人', t.diedAt === age ? 'died this year' : 'deceased') : W('存命', 'alive');
  const head = W(`- ${t.name}(${roleName(t.role)}・${T(RACES[t.race].name)}・${sexName(t)}・${state})`, `- ${t.name} (${roleName(t.role)}, ${T(RACES[t.race].name)}, ${sexName(t)}, ${state})`);
  const mems = mem ? t.mem.slice(-mem).map((m) => `    ${m.text}`) : [];
  return [head, ...mems].join('\n');
}

// 検査の材料。known は渡した事実の全文 (頼み方の文は入れない。そこの数字を許さないため) に、輪の全員と主人公の名を足したもの
function check(h: Hero, facts: string, age: number, death: boolean): Check {
  const names = [h.name, h.given, ...h.people.map((t) => t.name)];
  const dead = death ? [] : h.people.filter((t) => !t.alive && t.diedAt !== undefined && t.diedAt < age).map((t) => t.name);
  return { known: [facts, ...names].join('\n'), dead, death, en: isEn };
}

export interface Ask { msgs: Msg[]; check: Check }

// (1) その年の出来事に 2〜3文の細部を書き足す
export function yearPrompt(h: Hero, age = h.age): Ask {
  const now = age === h.age;
  const entries = h.log.filter((e) => e.age === age && e.kind !== 'death');
  const ids = [...new Set(entries.flatMap((e) => e.who ?? []))];
  const ties = ids.length ? ids.map((id) => h.people.find((t) => t.id === id)).filter((t): t is Tie => !!t) : now ? closest(h, 3) : [];
  const facts = [
    ...worldLines(h, now),
    ...heroLines(h, age),
    W('この年の出来事:', 'What happened this year:'),
    ...(entries.length ? entries.map((e) => `- ${e.text}`) : [W('- (目立った出来事はない)', '- (nothing notable)')]),
    ...(ties.length ? [W('関わった人:', 'People involved:'), ...ties.map((t) => personLine(t, age))] : []),
  ].join('\n');
  const ask = W(
    `この1年に、上の出来事と矛盾しない細部を2〜3文(合わせて120字以内)で書き足してください。出来事を言い直すのではなく、手ざわり・天気・匂い・会話のひとことのような細部を。\n次の形の JSON で答えてください: {"text": "…"}`,
    `Add 2 or 3 sentences of detail to this year (at most 60 words in all) that fit the events above. Do not restate the events; add texture: weather, a smell, a remark someone made.\nAnswer as JSON in this form: {"text": "…"}`);
  const msgs: Msg[] = [{ role: 'system', content: W(RULES_JA, RULES_EN) }, { role: 'user', content: `${facts}\n\n${ask}` }];
  return { msgs, check: check(h, facts, age, false) };
}

// 最後の言葉を頼める人: 最後にそばにいて、まだ生きている人
export const speakers = (h: Hero): Tie[] => summary(h).lastWith.filter((t) => t.alive);

// (2) 最後の言葉と (3) 墓碑銘を1回で頼む。検査は別々にするので、片方だけ使えることもある
export function deathPrompt(h: Hero): Ask {
  const sm = summary(h);
  const who = speakers(h);
  const facts = [
    ...worldLines(h, false),
    ...heroLines(h, h.age),
    W(`死: ${sm.text ?? ''}${sm.cause ? `(${sm.cause})` : ''}`, `Death: ${sm.text ?? ''}${sm.cause ? ` (${sm.cause})` : ''}`),
    W('一生の主な出来事:', 'Main events of the life:'),
    ...sm.highlights.map((e) => `- ${e.text}`),
    ...(who.length ? [W('最後にそばにいた人と、一緒に過ごした出来事:', 'Who was there at the end, and what they shared:'), ...who.map((t) => `${personLine(t, h.age, 4)} [id ${t.id}]`)] : []),
  ].join('\n');
  const ask = W(
    `${who.length ? `words: 最後にそばにいた人それぞれが、亡くなった${h.given}に向けて言う一言(1〜2文、60字以内)。その人と過ごした出来事に触れて。\n` : ''}epitaph: 墓に刻む一行(30字以内、改行なし)。\n次の形の JSON で答えてください: {${who.length ? '"words": [{"id": 0, "text": "…"}], ' : ''}"epitaph": "…"}`,
    `${who.length ? `words: for each person who was there at the end, one thing they say to ${h.given}, who has just died (1 or 2 sentences, at most 30 words). Touch on something they shared.\n` : ''}epitaph: one line to carve on the grave (at most 12 words, no line breaks).\nAnswer as JSON in this form: {${who.length ? '"words": [{"id": 0, "text": "…"}], ' : ''}"epitaph": "…"}`);
  const msgs: Msg[] = [{ role: 'system', content: W(RULES_JA, RULES_EN) }, { role: 'user', content: `${facts}\n\n${ask}` }];
  return { msgs, check: check(h, facts, h.age, true) };
}
