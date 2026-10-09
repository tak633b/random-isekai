// 追悼館に送られた記録の検証。Node のサーバ (server.mjs) と Cloudflare の関数 (functions/api) が共有する。依存なし
import { blocked } from './moderation.mjs';

// ---- 値の一覧 (src/engine/types.ts と同じ。ずれは server.test.mjs が見つける) ----
export const ENUMS = {
  world: ['medieval', 'dark', 'game', 'academy', 'wa', 'xianxia', 'steampunk', 'cyberpunk', 'space', 'modern', 'postapoc', 'ocean', 'desert', 'beast', 'myth', 'frontier'],
  race: ['human', 'elf', 'half_elf', 'dark_elf', 'dwarf', 'halfling', 'beast_dog', 'beast_cat', 'beast_rabbit', 'beast_fox', 'beast_wolf',
    'dragonkin', 'demon', 'vampire', 'oni', 'goblin', 'orc', 'lizardfolk', 'merfolk', 'winged', 'fairy', 'slime', 'homunculus', 'android', 'cyborg', 'mutant', 'alien'],
  sex: ['F', 'M'],
  status: ['slave', 'orphan', 'poor', 'commoner', 'merchant', 'gentry', 'noble', 'royal'],
  hazard: ['infant', 'disease', 'monster', 'violence', 'war', 'accident', 'childbirth', 'magic', 'execution', 'famine', 'plague', 'age'],
  role: ['mother', 'father', 'sibling', 'spouse', 'child', 'lover', 'fiance', 'friend', 'companion', 'mentor', 'rival', 'nemesis', 'familiar', 'master', 'servant', 'disciple'],
  job: ['farmer', 'merchant', 'smith', 'alchemist', 'herbalist', 'priest', 'knight', 'soldier', 'mercenary', 'adventurer', 'mage', 'scholar', 'bard', 'thief', 'tamer', 'cook',
    'lord', 'servant', 'hunter', 'sailor', 'miner', 'assassin', 'necromancer', 'hero', 'saint', 'samurai', 'onmyoji', 'cultivator', 'ninja', 'engineer', 'factory', 'airship',
    'corp', 'hacker', 'pilot', 'medic', 'researcher', 'office', 'explorer', 'police', 'scavenger', 'raider'],
  stage: ['infant', 'child', 'teen', 'adult', 'middle', 'elder'],
  place: ['home', 'field', 'town', 'guild', 'dungeon', 'battle', 'academy', 'temple', 'shop', 'forge', 'lab', 'castle', 'ship', 'wild', 'city', 'grave'],
  home: ['hovel', 'house', 'manor', 'castle'],
  tod: ['morning', 'day', 'dusk', 'night'],
  lang: ['ja', 'en'],
};
export const SETS = Object.fromEntries(Object.entries(ENUMS).map(([k, v]) => [k, new Set(v)]));

export const MAX_BODY = 16 * 1024;
export const LINEAGE_MAX = 12;
export const LIST_MAX = 50;

// ---- 入力の検証 -------------------------------------------------------------
// 制御文字 (改行も) と、文字の向きを入れ替える書式文字を取り除く
const CTRL = /[\u0000-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g;

export class Invalid extends Error {}
const fail = (what) => { throw new Invalid(what); };
const oneOf = (v, set, what) => (SETS[set].has(v) ? v : fail(what));
const int = (v, min, max, what) => (Number.isInteger(v) && v >= min && v <= max ? v : fail(what));
// 文字数はコードポイントで数える。長すぎるものは切らずに弾く
function text(v, max, what, { optional = false } = {}) {
  if (v === undefined || v === null) return optional ? '' : fail(what);
  if (typeof v !== 'string') fail(what);
  const s = v.replace(CTRL, '').trim();
  if ([...s].length > max) fail(`${what} too long`);
  if (!s && !optional) fail(what);
  if (blocked(s)) fail(`${what} not allowed`);
  return s;
}
const list = (v, max, what) => (Array.isArray(v) && v.length <= max ? v : fail(what));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// 場面の材料。形が違えば捨てる (記録そのものは受け取る)
function scene(v) {
  try {
    if (!isObj(v)) return null;
    const figures = list(v.figures, 5, 'figures').map((f) => {
      if (!isObj(f)) fail('figure');
      return {
        seed: int(f.seed, 0, 0xffffffff, 'seed'), race: oneOf(f.race, 'race', 'race'), sex: oneOf(f.sex, 'sex', 'sex'),
        stage: oneOf(f.stage, 'stage', 'stage'), job: f.job === null ? null : oneOf(f.job, 'job', 'job'), status: oneOf(f.status, 'status', 'status'),
        ...(typeof f.me === 'boolean' ? { me: f.me } : {}), ...(typeof f.dead === 'boolean' ? { dead: f.dead } : {}),
      };
    });
    return {
      seed: int(v.seed, 0, 0xffffffff, 'seed'), world: oneOf(v.world, 'world', 'world'), place: oneOf(v.place, 'place', 'place'),
      home: oneOf(v.home, 'home', 'home'), tod: oneOf(v.tod, 'tod', 'tod'), season: int(v.season, 0, 3, 'season'), figures,
      ...(typeof v.dead === 'boolean' ? { dead: v.dead } : {}),
    };
  } catch (e) {
    if (e instanceof Invalid) return null;
    throw e;
  }
}

// 送られた記録を、保存する形に作り直す。だめなら Invalid を投げる
export function validEntry(b) {
  if (!isObj(b)) fail('body');
  return {
    seed: int(b.seed, 0, Number.MAX_SAFE_INTEGER, 'seed'),
    world: oneOf(b.world, 'world', 'world'),
    name: text(b.name, 60, 'name'),
    race: oneOf(b.race, 'race', 'race'),
    sex: oneOf(b.sex, 'sex', 'sex'),
    status: oneOf(b.status, 'status', 'status'),
    age: int(b.age, 0, 100000, 'age'),
    hazard: oneOf(b.hazard, 'hazard', 'hazard'),
    causeLabel: text(b.causeLabel, 60, 'causeLabel'),
    causeText: text(b.causeText, 400, 'causeText'),
    why: text(b.why, 200, 'why', { optional: true }),
    highlights: list(b.highlights ?? [], 12, 'highlights').map((e) => {
      if (!isObj(e)) fail('highlight');
      return { age: int(e.age, 0, 100000, 'highlight age'), text: text(e.text, 200, 'highlight') };
    }),
    lastWith: list(b.lastWith ?? [], 3, 'lastWith').map((t) => {
      if (!isObj(t)) fail('lastWith');
      return { name: text(t.name, 60, 'lastWith name'), role: oneOf(t.role, 'role', 'role') };
    }),
    note: text(b.note, 140, 'note', { optional: true }),
    scene: scene(b.scene),
    lang: oneOf(b.lang ?? 'ja', 'lang', 'lang'),
    // 系譜 (任意): 何代目か (1 = 初代) と、前の代の主人公の名前を古い順に
    gen: b.gen === undefined || b.gen === null ? 1 : int(b.gen, 1, 999, 'gen'),
    lineage: list(b.lineage ?? [], LINEAGE_MAX, 'lineage').map((n) => text(n, 60, 'lineage name')),
  };
}
