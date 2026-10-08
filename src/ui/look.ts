// 見た目の決め方。顔 (portrait.ts) と立ち絵 (sprite.ts) と場面 (scene.ts) が同じものを引く。
// 色・髪型は Figure.seed から決まるので、同じ人は何度描いても同じ。種族で色の幅と耳・角・尻尾・翼が決まり、
// 段階 (Stage) で背丈・白髪・しわ、職業で服と持ち物、身分で飾り (冠・刺繍・継ぎ当て・首輪) が付く。
import type { Figure, JobId, RaceId, Sex, Stage, Status } from '../engine/types';
import { hash, mixc } from './raster';

export type HairStyle = 'short' | 'spiky' | 'side' | 'long' | 'bob' | 'pony' | 'twin' | 'bun' | 'braid' | 'bald' | 'tuft' | 'none';
export type Ear = 'round' | 'elf' | 'half' | 'goblin' | 'fin' | 'mech' | 'none';
export type BeastEar = 'dog' | 'dogdrop' | 'cat' | 'rabbit' | 'fox' | 'wolf';
export type Horn = 'back' | 'up' | 'oni1' | 'oni2' | 'ram';
export type Tail = 'curl' | 'thin' | 'round' | 'fox' | 'wolf' | 'dragon' | 'devil' | 'lizard';
export type Wing = 'feather' | 'bat' | 'fairy';
export type Kind = 'tunic' | 'robe' | 'armor' | 'coat' | 'suit' | 'kimono' | 'apron' | 'rags' | 'dress';
export type Hat = 'wizard' | 'hood' | 'helm' | 'kettle' | 'straw' | 'chef' | 'mitre' | 'veil' | 'goggles' | 'eboshi' | 'band' | 'cap' | 'hardhat' | 'lamp' | 'aviator' | 'brim' | 'feather' | 'visor' | 'circlet' | 'bandana';
export type Item =
  | 'sword' | 'shield' | 'staff' | 'bow' | 'whip' | 'bag' | 'hoe' | 'hammer' | 'katana' | 'ofuda' | 'wrench' | 'tablet'
  | 'flask' | 'basket' | 'book' | 'cross' | 'spear' | 'axe' | 'dagger' | 'lute' | 'ladle' | 'scepter' | 'tray' | 'pick'
  | 'skull' | 'holy' | 'light' | 'star' | 'gun' | 'case' | 'kit' | 'board' | 'baton' | 'torch' | 'bar' | 'club' | 'rope' | 'box' | 'helmet' | 'scope' | 'whisk' | 'cane';
export type Back = 'pack' | 'quiver' | 'greatsword' | 'blade' | 'cape';
export type Mask = 'gas' | 'cloth';

export interface Look {
  race: RaceId; sex: Sex; stage: Stage;
  skin: string; skin2: string;       // skin2: 鱗・継ぎ目・機械・斑点の色
  hair: string; eye: string; pupil: 'round' | 'slit' | 'glow' | 'black';
  style: HairStyle; ear: Ear; beast?: BeastEar; fur: string;
  horn?: Horn; hornC: string; tail?: Tail; tails: number; wing?: Wing; wingC: string; halo?: boolean;
  scales?: boolean; seams?: boolean; mech?: boolean; spots?: boolean; jelly?: boolean; tusks?: boolean; fangs?: boolean;
  beard?: boolean; snout?: boolean; bigNose?: boolean; alien?: boolean; fish?: boolean; rune?: boolean; blush?: boolean;
  grey: number; wrinkle: 0 | 1 | 2;
  head: number; body: number; leg: number; width: number; stoop: boolean;   // 立ち絵の寸法 (px)
  kind: Kind; cloth: string; trim: string; pants: string; boots: string;
  hat?: Hat; hatC: string; item?: Item; off?: Item; back?: Back; mask?: Mask; cape?: string;
  crown?: 'crown' | 'tiara'; collar?: boolean; gold?: boolean; patch?: boolean; barefoot?: boolean;
  bg: string;
}

// 人間の肌: 濃い方から薄い方へ
const SKINS = ['#4a2c1e', '#6a3e28', '#8a5436', '#a8704c', '#c08a64', '#d4a07e', '#e4b694', '#f0c8a8', '#f6d8bc'];
const HAIR_NAT = ['#16120f', '#2a1e16', '#4a3020', '#6a4426', '#8a5a30', '#b88a4a', '#d8b468', '#8a3a1e', '#b0502a'];
const HAIR_ANIME = ['#c8ccd8', '#4a6ab0', '#d86a9a', '#6a4a9a', '#3a8a6a', '#e8e4e0', '#c03a3a', '#7ab0d8'];
const EYES_NAT = ['#3a2416', '#5a3a1e', '#3a5a7a', '#4a6a3a', '#6a6a72', '#7a5a2a'];
const CLOTH = ['#2e4258', '#a8343e', '#4a6a3a', '#5a5a48', '#7a5a3a', '#2e6a5a', '#c8bca4', '#5a4a6a', '#b0802a', '#3a5a8a', '#6a3a4a', '#40607a', '#8a6a4a', '#4a5a6a'];
const PANTS = ['#2a2c3c', '#3a3028', '#22303a', '#3a3a3a', '#4a3e52', '#5a5040'];
const BG = ['#a8b4c0', '#c4bcb0', '#b8c0b0', '#c8c0b0', '#b8c4b4', '#a8b0b8', '#c8c0c4', '#c4bca8', '#b0bcc8', '#b4bcc4'];

interface RaceLook {
  skins: string[]; hairs?: string[]; eyes?: string[]; pupil?: Look['pupil']; ear?: Ear; beast?: BeastEar[]; furs?: string[];
  horn?: Horn[]; hornC?: string[]; tail?: Tail; wing?: Wing; wingC?: string[]; skin2?: string[];
  size?: [number, number, number, number];   // 脚・胴の倍率、胴の幅・頭の増分
  flags?: Partial<Pick<Look, 'scales' | 'seams' | 'mech' | 'spots' | 'jelly' | 'tusks' | 'fangs' | 'snout' | 'bigNose' | 'alien' | 'fish' | 'rune'>>;
  bald?: boolean;
}
const FAIR = SKINS.slice(5);
const R: Record<RaceId, RaceLook> = {
  human: { skins: SKINS },
  elf: { skins: ['#f8e4d2', '#f2d4bc', '#e8c0a0', '#d4a07e', '#a87650'], hairs: ['#e8d088', '#f0e0b0', '#d8dce4', '#b8d098', '#a86a30', '#c8a060'], eyes: ['#3a7a5a', '#4a7aa0', '#7a9a4a', '#5a8a9a'], ear: 'elf', size: [1.1, 1, -1, 0] },
  half_elf: { skins: SKINS.slice(3), ear: 'half', eyes: ['#3a7a5a', '#4a6a8a', '#5a3a1e', '#6a7a4a'] },
  dark_elf: { skins: ['#7a6070', '#6a5a6e', '#5a4a5a', '#4e4a66', '#8a6a5a', '#6e5a50'], hairs: ['#e8e4f0', '#c8c8d8', '#d8c8e8', '#f0f0f0', '#9a8ab0'], eyes: ['#c83a3a', '#a04ac8', '#d8a030', '#e05a7a'], ear: 'elf', size: [1.1, 1, -1, 0] },
  dwarf: { skins: ['#c88a6a', '#d49a7a', '#b07050', '#e0a888', '#9a6a4a'], hairs: ['#8a3a1e', '#a8502a', '#4a3020', '#2a1e16', '#c07a3a', '#6a4426'], size: [0.55, 0.9, 4, 0] },
  halfling: { skins: SKINS.slice(3), hairs: ['#6a4426', '#8a5a30', '#4a3020', '#b88a4a'], size: [0.6, 0.75, 0, -1] },
  beast_dog: { skins: SKINS.slice(2), beast: ['dog', 'dogdrop'], furs: ['#8a5a30', '#e8e0d0', '#2a2420', '#c09060', '#6a4426'], tail: 'curl' },
  beast_cat: { skins: SKINS.slice(3), beast: ['cat'], furs: ['#2a2428', '#ece6dc', '#d08a3a', '#8a8a92', '#a87a4a'], tail: 'thin', pupil: 'slit', eyes: ['#c8a020', '#4a9a5a', '#4a8ac0', '#d07a20'] },
  beast_rabbit: { skins: SKINS.slice(4), beast: ['rabbit'], furs: ['#f0ece4', '#a88060', '#e8d8c8', '#5a4a40'], tail: 'round', eyes: ['#c03a4a', '#6a3a2a', '#8a5a3a'] },
  beast_fox: { skins: SKINS.slice(3), beast: ['fox'], furs: ['#d8782a', '#e8a04a', '#f0e8d8', '#c8a040'], tail: 'fox', pupil: 'slit', eyes: ['#d8a020', '#c86a20', '#a03a2a'] },
  beast_wolf: { skins: SKINS.slice(2), beast: ['wolf'], furs: ['#7a7a82', '#b8bcc4', '#4a4a50', '#8a6a4a'], tail: 'wolf', eyes: ['#d8b030', '#7aa0c0', '#c87a2a'], size: [1.1, 1.08, 2, 0] },
  dragonkin: { skins: SKINS.slice(3), skin2: ['#b0402a', '#3a7a4a', '#3a5a9a', '#c0a030', '#3a3440', '#8a3a7a'], horn: ['back'], hornC: ['#e8dcc0', '#4a4048', '#c8a868'], tail: 'dragon', pupil: 'slit', eyes: ['#e0a020', '#d04a2a', '#5ab0a0'], size: [1.15, 1.1, 2, 0], flags: { scales: true } },
  demon: { skins: ['#a8b4d0', '#9aa0b8', '#b88a9a', '#8a7a9a', '#c0a0b0', '#7a8aa8'], hairs: ['#1a1418', '#3a2a4a', '#e0dce8', '#8a2a3a', '#4a3a6a'], horn: ['up', 'ram'], hornC: ['#2a2228', '#4a3a3a', '#d8ccb8'], tail: 'devil', wing: 'bat', wingC: ['#3a2a3a', '#4a2a2a', '#2a2a40'], eyes: ['#e03030', '#e0a020', '#b040e0'], pupil: 'black', size: [1.05, 1.05, 1, 0] },
  vampire: { skins: ['#e8e4ec', '#dcd8e4', '#f0e8ea', '#d4d0dc'], hairs: ['#1a1418', '#2a1e24', '#e8e4f0', '#d8c088', '#5a1a24'], eyes: ['#d02a2a', '#b01a3a'], flags: { fangs: true } },
  oni: { skins: [...SKINS.slice(2), '#c85a4a', '#5a7ab8', '#d06a50'], hairs: ['#16120f', '#2a1e16', '#e8e4e0', '#a83a2a', '#3a4a6a'], horn: ['oni1', 'oni2'], hornC: ['#e8d8a0', '#f0ece0', '#c8b070'], eyes: ['#c8a020', '#3a2416', '#c83a2a'], size: [1.3, 1.2, 4, 0], flags: { fangs: true } },
  goblin: { skins: ['#7a9a4a', '#6a8a3a', '#8aa85a', '#5a7a3a'], hairs: ['#2a2018', '#4a3a28', '#1a1a14'], ear: 'goblin', eyes: ['#e0c020', '#d05a20'], size: [0.6, 0.75, -1, 0], flags: { bigNose: true } },
  orc: { skins: ['#6a8a4a', '#7a8a5a', '#5a7040', '#7a8078', '#8a9a6a'], hairs: ['#16120f', '#2a2018', '#4a3a28'], eyes: ['#c8a020', '#a03a2a', '#3a2416'], ear: 'goblin', size: [1.2, 1.15, 4, 1], flags: { tusks: true } },
  lizardfolk: { skins: ['#5a8a4a', '#6a7a3a', '#3a7a6a', '#8a7a4a', '#4a6a5a', '#7a5a3a'], ear: 'none', tail: 'lizard', pupil: 'slit', eyes: ['#e0c020', '#d07a20', '#c0d040'], size: [1.1, 1.1, 2, 0], flags: { snout: true, scales: true }, bald: true },
  merfolk: { skins: [...SKINS.slice(4), '#b8d0d8', '#a8c8d0'], skin2: ['#3a9a9a', '#4a7ac0', '#3aa07a', '#7a5ab0', '#d07a8a'], hairs: ['#3a6ab0', '#3a9a9a', '#d87a9a', '#e8d088', '#6a4a9a', '#2a4a6a'], eyes: ['#3a8ab0', '#3aa090', '#6a5ab0'], ear: 'fin', flags: { fish: true, scales: true } },
  winged: { skins: SKINS.slice(2), hairs: [...HAIR_NAT, '#f0e8d0', '#e8e4e0'], wing: 'feather', wingC: ['#f4f0e8', '#e8e0d0', '#8a7a6a', '#3a3438', '#c8b8a0'] },
  fairy: { skins: FAIR, hairs: ['#f0b0d0', '#a0d0f0', '#c0f0a0', '#f0e090', '#d0b0f0', '#f0f0f0'], eyes: ['#4a8ac0', '#6aa04a', '#c05aa0'], ear: 'half', wing: 'fairy', wingC: ['#c8f0ff', '#f0d0ff', '#d0ffe0', '#fff0c0'], size: [0.4, 0.5, -4, -3] },
  slime: { skins: ['#5ab0e0', '#7ad08a', '#e07ab0', '#b08ae0', '#e0c050', '#60d0c0'], ear: 'none', flags: { jelly: true }, size: [1, 1, 0, 0] },
  homunculus: { skins: ['#f4e8e4', '#ece0dc', '#f0e4e8'], hairs: ['#f0f0f4', '#e4e0ec', '#d8dce8'], eyes: ['#c83a4a', '#d04a6a', '#a83a8a'], flags: { rune: true } },
  android: { skins: ['#f0ece8', '#e8e4e4', '#dcd8d8', '#c8b8a8', '#a08070'], skin2: ['#8a96a8', '#7a8a9a'], hairs: ['#d8dce8', '#40c0d0', '#e0a0c0', '#2a2a30', '#a0a8b8', '#5a8ae0'], eyes: ['#40e0f0', '#60f0a0', '#f0a040'], pupil: 'glow', ear: 'mech', flags: { seams: true } },
  cyborg: { skins: SKINS, skin2: ['#8a96a8', '#6a7280', '#a0a8b0'], hairs: [...HAIR_NAT, '#40c0d0', '#c03a3a'], flags: { mech: true } },
  mutant: { skins: ['#a8b07a', '#9aa880', '#b8a890', '#a09ab0', '#c0a888'], skin2: ['#5a8a3a', '#6a4a7a', '#7a9a2a'], hairs: ['#3a3a2a', '#8a8a6a', '#5a6a3a', '#c8c8b0'], eyes: ['#d0c020', '#a0d040', '#e05a30'], flags: { spots: true } },
  alien: { skins: ['#a8acb4', '#9aa49a', '#a0b0c0', '#b0a8c0'], eyes: ['#141018'], pupil: 'black', ear: 'none', size: [0.8, 0.8, -2, 3], flags: { alien: true }, bald: true },
};

// 職業の服: [服の種類, 服の色 (null は seed から), 縁取り, 帽子, 利き手, 反対の手, 背中, 覆面]
type Outfit = [Kind, string | null, string | null, Hat?, Item?, Item?, Back?, Mask?];
const JOB: Record<JobId, Outfit> = {
  farmer: ['tunic', '#7a6a3a', null, 'straw', 'hoe'],
  merchant: ['coat', '#7a3a2a', '#d8b050', 'cap', 'bag'],
  smith: ['apron', '#5a4a3a', '#3a2a20', 'band', 'hammer'],
  alchemist: ['apron', '#4a5a4a', '#c8bca4', 'goggles', 'flask'],
  herbalist: ['dress', '#5a7a3a', '#c8bca4', 'band', 'basket'],
  priest: ['robe', '#ece6dc', '#3a5aa0', 'mitre', 'cross', 'book'],
  knight: ['armor', '#a8b0bc', '#2e4a8a', undefined, 'sword', 'shield', 'cape'],
  soldier: ['armor', '#8a8a7a', '#6a3a2a', 'kettle', 'spear'],
  mercenary: ['tunic', '#5a4a3a', '#8a8a8a', 'bandana', 'axe', undefined, 'greatsword'],
  adventurer: ['tunic', null, '#7a5a3a', undefined, 'sword', 'shield', 'pack'],
  mage: ['robe', null, '#d8b050', 'wizard', 'staff'],
  scholar: ['robe', '#4a4a6a', '#c8bca4', undefined, 'book', 'scope'],
  bard: ['tunic', '#a8343e', '#d8b050', 'feather', 'lute'],
  thief: ['tunic', '#4a5a3a', '#3a3028', 'hood', 'dagger', 'bag'],
  tamer: ['tunic', '#8a5a3a', '#3a6a5a', 'band', 'whip'],
  cook: ['apron', '#ece6dc', '#c8bca4', 'chef', 'ladle'],
  lord: ['coat', '#5a2a4a', '#d8b050', undefined, 'scepter', undefined, 'cape'],
  servant: ['apron', '#2a2a32', '#ece6dc', undefined, 'tray'],
  hunter: ['tunic', '#4a5a2a', '#6a4a2a', 'brim', 'bow', undefined, 'quiver'],
  sailor: ['tunic', '#3a5a8a', '#ece6dc', 'bandana', 'rope'],
  miner: ['tunic', '#6a5a4a', '#3a3a3a', 'lamp', 'pick'],
  assassin: ['tunic', '#22202a', '#6a2a2a', 'hood', 'dagger', 'dagger', undefined, 'cloth'],
  necromancer: ['robe', '#24202c', '#7a4ab0', 'hood', 'skull'],
  hero: ['armor', '#c8ccd8', '#d8b050', 'circlet', 'light', 'shield', 'cape'],
  saint: ['robe', '#f4f0e8', '#d8b050', 'veil', 'holy'],
  samurai: ['kimono', null, '#2a2a3a', undefined, 'katana'],
  onmyoji: ['kimono', '#ece6dc', '#6a3a8a', 'eboshi', 'ofuda'],
  cultivator: ['robe', '#a8c0d0', '#ece6dc', undefined, 'whisk', undefined, 'blade'],
  ninja: ['kimono', '#2a2a40', '#1a1a24', 'band', 'star', undefined, 'blade', 'cloth'],
  engineer: ['apron', '#6a5a3a', '#3a3028', 'goggles', 'wrench'],
  factory: ['tunic', '#4a6a8a', '#3a4a5a', 'hardhat', 'box'],
  airship: ['coat', '#7a4a2a', '#d8ccb8', 'aviator', 'scope'],
  corp: ['suit', '#2a2a30', '#40c0d0', undefined, 'case'],
  hacker: ['coat', '#3a3a44', '#40e0a0', 'hood', 'tablet'],
  pilot: ['suit', '#e8e4dc', '#d86a2a', 'visor', 'helmet'],
  medic: ['coat', '#f0eeea', '#d03a3a', undefined, 'kit'],
  researcher: ['coat', '#f0eeea', '#5a7ab0', undefined, 'board', 'flask'],
  office: ['suit', '#4a5a6a', '#ece6dc', undefined, 'case'],
  explorer: ['tunic', '#8a7a5a', '#5a4a30', 'brim', 'torch', undefined, 'pack'],
  police: ['suit', '#2a3a5a', '#d8b050', 'cap', 'baton'],
  scavenger: ['rags', '#6a6248', '#4a4a3a', undefined, 'bar', undefined, 'pack', 'gas'],
  raider: ['rags', '#4a3a2a', '#8a8a8a', 'bandana', 'gun', 'club'],
};

const STAGE: Record<Stage, [number, number, number, number]> = {   // 頭・胴・脚・胴の幅
  infant: [11, 6, 3, 7], child: [12, 9, 5, 8], teen: [13, 11, 8, 9], adult: [13, 13, 9, 10], middle: [13, 13, 9, 11], elder: [13, 12, 8, 10],
};
const LOW: Status[] = ['slave', 'orphan', 'poor'];

const at = <T>(a: readonly T[], u: number): T => a[Math.floor(u * a.length) % a.length];
const even = (n: number) => 2 * Math.max(2, Math.round(n / 2));

function hairStyle(sex: Sex, stage: Stage, u: number, v: number): HairStyle {
  if (stage === 'infant') return 'tuft';
  if (sex === 'M') {
    if ((stage === 'elder' && v < 0.4) || (stage === 'middle' && v < 0.15)) return 'bald';
    return at<HairStyle>(['short', 'short', 'spiky', 'side', 'side', 'long', 'pony'], u);
  }
  if (stage === 'child') return at<HairStyle>(['twin', 'bob', 'pony', 'long', 'braid'], u);
  if (stage === 'elder' && v < 0.6) return 'bun';
  return at<HairStyle>(['long', 'long', 'bob', 'pony', 'twin', 'bun', 'braid', 'side'], u);
}

export function lookOf(f: Figure): Look {
  const u = (k: number) => hash(f.seed, 0x1007, k) / 4294967296;
  const r = R[f.race];
  const fl = r.flags ?? {};
  const [hd, bd, lg, wd] = STAGE[f.stage];
  const [kl, kb, dw, dh] = r.size ?? [1, 1, 0, 0];
  const old = f.stage === 'elder', mid = f.stage === 'middle', young = f.stage === 'infant' || f.stage === 'child';
  const grow = f.stage === 'adult' || mid || old;

  const humanHair = f.race === 'human' || f.race === 'half_elf' || f.race === 'cyborg' || f.race.startsWith('beast');
  const hair0 = r.hairs ? at(r.hairs, u(1)) : humanHair && u(2) < 0.18 ? at(HAIR_ANIME, u(3)) : at(HAIR_NAT, u(1));
  const grey = old ? 0.65 + u(4) * 0.35 : mid ? u(4) * 0.4 : 0;
  const jelly = !!fl.jelly;
  const skin = at(r.skins, u(5));
  const style: HairStyle = r.bald ? 'none' : jelly ? (f.sex === 'F' ? 'bob' : 'short') : hairStyle(f.sex, f.stage, u(6), u(7));

  const job = f.job ? JOB[f.job] : null;
  const low = LOW.includes(f.status);
  const muted = (c: string) => (low ? mixc(c, '#7a6a58', 0.45) : c);
  const cloth = muted(job?.[1] ?? at(CLOTH, u(8)));
  let kind: Kind = job?.[0] ?? (f.sex === 'F' && !young && u(9) < 0.5 ? 'dress' : 'tunic');
  if (!job && (f.status === 'slave' || f.status === 'orphan')) kind = 'rags';
  const fur = r.furs ? at(r.furs, u(10)) : hair0;

  const look: Look = {
    race: f.race, sex: f.sex, stage: f.stage,
    skin, skin2: r.skin2 ? at(r.skin2, u(11)) : mixc(skin, '#140c10', 0.35),
    hair: jelly ? mixc(skin, '#ffffff', 0.15) : mixc(hair0, '#e0dcd4', grey),
    eye: r.eyes ? at(r.eyes, u(12)) : at(EYES_NAT, u(12)), pupil: r.pupil ?? 'round',
    style, ear: r.ear ?? 'round', beast: r.beast ? at(r.beast, u(13)) : undefined, fur: mixc(fur, '#e0dcd4', grey * 0.6),
    horn: r.horn ? at(r.horn, u(14)) : undefined, hornC: r.hornC ? at(r.hornC, u(15)) : '#e8dcc0',
    tail: r.tail, tails: f.race === 'beast_fox' && u(16) < 0.15 ? 3 : 1,
    wing: r.wing, wingC: r.wingC ? at(r.wingC, u(17)) : '#f4f0e8', halo: f.race === 'winged' && u(18) < 0.35,
    ...fl,
    beard: (f.race === 'dwarf' && f.sex === 'M' && !young && f.stage !== 'teen') || (f.sex === 'M' && grow && !r.bald && !jelly && !['elf', 'dark_elf', 'fairy', 'homunculus', 'android', 'vampire'].includes(f.race) && u(19) < 0.12),
    blush: f.sex === 'F' && !old && u(20) < 0.5,
    grey, wrinkle: old ? 2 : mid ? 1 : 0,
    head: hd + dh, body: Math.max(5, Math.round(bd * kb)), leg: Math.max(2, Math.round(lg * kl)), width: even(wd + dw), stoop: old,
    kind, cloth, trim: muted(job?.[2] ?? mixc(cloth, '#140c10', 0.4)), pants: muted(at(PANTS, u(21))), boots: low ? '#5a4a3a' : '#3a2a22',
    hat: young ? undefined : job?.[3], hatC: mixc(cloth, '#140c10', 0.25),
    item: young ? undefined : job?.[4], off: young ? undefined : job?.[5] ?? (old && u(22) < 0.7 ? 'cane' : undefined),
    back: young ? undefined : job?.[6], mask: young ? undefined : job?.[7],
    crown: f.status === 'royal' ? (f.sex === 'M' && grow ? 'crown' : 'tiara') : undefined,
    collar: f.status === 'slave', gold: f.status === 'noble' || f.status === 'royal' || f.status === 'gentry',
    patch: f.status === 'poor' || f.status === 'orphan', barefoot: f.status === 'slave' || f.race === 'halfling',
    cape: f.status === 'royal' || f.status === 'noble' ? (f.status === 'royal' ? '#8a1a2a' : '#2a3a6a') : undefined,
    bg: at(BG, u(23)),
  };
  if (job?.[6] === 'cape') look.cape = look.cape ?? mixc(look.trim, '#140c10', 0.1);
  if (look.hat === 'wizard' || look.hat === 'hood') look.hatC = cloth;
  if (look.hat === 'mitre' || look.hat === 'veil') look.hatC = look.cloth;
  return look;
}
