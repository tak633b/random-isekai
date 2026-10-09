// 敵 48×48。透明の背景で足元が下端、左 (主人公の側) を向く。世界と相手の大分類 (Foe) から姿を選び、seed で振る。
// 姿は数種類の描き方 (人型・四つ足・多脚・ぷよぷよ・霊・竜・機械・妖怪) を色と飾りで描き分ける。最後に 1px の暗い輪郭。
import type { Foe, WorldId } from '../engine/types';
import { hash, mixc, Pix, tones } from './raster';
import { layDown, outline } from './sprite';

export const ENEMY_W = 48, ENEMY_H = 48;
export interface EnemySpec { world: WorldId; foe: Foe; seed: number }
export type EnemyPose = 'idle' | 'attack' | 'hurt' | 'down';

type Shape = 'man' | 'quad' | 'legs' | 'slime' | 'ghost' | 'dragon' | 'serpent' | 'drone' | 'kasa' | 'kraken' | 'centipede' | 'worm' | 'rider';
type Head = 'human' | 'goblin' | 'skull' | 'robot' | 'oni' | 'kappa' | 'demon' | 'mutant' | 'zombie' | 'stone' | 'tengu' | 'grey' | 'orc' | 'mummy';
type Hat = 'hood' | 'jingasa' | 'helm' | 'visor' | 'bandana' | 'turban' | 'mohawk' | 'gasmask' | 'kasa' | 'shako' | 'cap' | 'kabuto' | 'qing' | 'shades';
type Weapon = 'club' | 'dagger' | 'spear' | 'katana' | 'rifle' | 'gun' | 'trident' | 'scimitar' | 'kanabo' | 'claws' | 'sword' | 'scythe' | 'fist' | 'cannon' | 'fan' | 'axe';
interface V {
  id: string; shape: Shape; c: string; c2: string; eye: string; size?: number;
  head?: Head; hat?: Hat; weapon?: Weapon; shield?: boolean; wings?: boolean; horns?: boolean; tail?: boolean; bones?: boolean;
  mane?: boolean; stripes?: boolean; spots?: boolean; tusks?: boolean; aura?: string; metal?: boolean; claws?: boolean; stinger?: boolean; ghostly?: boolean; hair?: string;
  snake?: boolean; tails?: number; many?: boolean; reach?: boolean; arrows?: boolean; ofuda?: boolean; siren?: boolean; tendrils?: boolean;
}
const DARK = '#1a1018', BONE = '#e8e2d0', STEEL = '#9aa2b0', WOOD = '#7a5232';

// ---- 姿の一覧 ----
const SLIME = (c: string): V => ({ id: 'slime', shape: 'slime', c, c2: '#ffffff', eye: DARK });
const GOBLIN: V = { id: 'goblin', shape: 'man', c: '#7a9a4a', c2: '#6a5038', eye: '#e8c020', size: 0.7, head: 'goblin', weapon: 'club' };
const WOLF = (c: string, eye = '#e04030'): V => ({ id: 'wolf', shape: 'quad', c, c2: mixc(c, '#ffffff', 0.4), eye, tail: true });
const SPIDER: V = { id: 'spider', shape: 'legs', c: '#3a3040', c2: '#6a3a5a', eye: '#e03030' };
const SCORPION: V = { id: 'scorpion', shape: 'legs', c: '#a8803a', c2: '#6a4a20', eye: DARK, stinger: true, claws: true };
const CRAB: V = { id: 'crab', shape: 'legs', c: '#c84a2a', c2: '#f0c0a0', eye: DARK, claws: true, size: 1.1 };
const BUG: V = { id: 'alienbug', shape: 'legs', c: '#4a6a3a', c2: '#a0d040', eye: '#ff40a0', claws: true, aura: '#a0ff60' };
const KRAKEN: V = { id: 'kraken', shape: 'kraken', c: '#8a3a6a', c2: '#e8a0c0', eye: '#f0d040' };
const BEAR: V = { id: 'bear', shape: 'quad', c: '#5a3a24', c2: '#8a6040', eye: DARK, size: 1.15 };
const BOAR: V = { id: 'boar', shape: 'quad', c: '#6a4a3a', c2: '#3a2a20', eye: '#e04030', tusks: true, mane: true };
const TIGER: V = { id: 'tiger', shape: 'quad', c: '#d8882a', c2: '#2a2018', eye: '#e8d040', stripes: true, tail: true };
const SPIRIT: V = { id: 'spiritbeast', shape: 'quad', c: '#e8ecf4', c2: '#80b0ff', eye: '#40a0ff', tail: true, mane: true, horns: true, aura: '#80c0ff' };
const HOUND: V = { id: 'mutanthound', shape: 'quad', c: '#7a7a5a', c2: '#a04a3a', eye: '#f0e040', spots: true, tusks: true };
const CYBERDOG: V = { id: 'cyberhound', shape: 'quad', c: '#6a7280', c2: '#40e0f0', eye: '#ff3040', metal: true, tail: true };
const SKELETON: V = { id: 'skeleton', shape: 'man', c: BONE, c2: '#8a8070', eye: '#ff4040', head: 'skull', bones: true, weapon: 'sword', shield: true };
const WRAITH: V = { id: 'wraith', shape: 'ghost', c: '#3a3448', c2: '#7a70a0', eye: '#80f0ff', weapon: 'scythe', ghostly: true };
const YUREI: V = { id: 'yurei', shape: 'ghost', c: '#eceae4', c2: '#c8c4d0', eye: DARK, hair: '#14121a', ghostly: true };
const ZOMBIE: V = { id: 'zombie', shape: 'man', c: '#8a9a6a', c2: '#5a5040', eye: '#f0f080', head: 'zombie', weapon: 'fist' };
const KASA: V = { id: 'kasaobake', shape: 'kasa', c: '#c84a3a', c2: '#e8d8b0', eye: DARK };
const KAPPA: V = { id: 'kappa', shape: 'man', c: '#5a9a5a', c2: '#3a6a3a', eye: '#f0d040', size: 0.75, head: 'kappa', weapon: 'claws' };
const ONI: V = { id: 'oni', shape: 'man', c: '#c84a3a', c2: '#d8b040', eye: '#f0e040', size: 1.15, head: 'oni', weapon: 'kanabo', horns: true };
const BLUEONI: V = { ...ONI, id: 'blueoni', c: '#4a6ab0' };
const DEMON: V = { id: 'demonsoldier', shape: 'man', c: '#7a4a8a', c2: '#3a2430', eye: '#ff3030', head: 'demon', weapon: 'trident', horns: true, wings: true, tail: true };
const VOIDDEMON: V = { ...DEMON, id: 'voiddemon', c: '#3a3a6a', c2: '#1a1a30', eye: '#40ffe0', aura: '#a060ff' };
const MUTANT: V = { id: 'mutant', shape: 'man', c: '#8aa05a', c2: '#5a4a3a', eye: '#f0e040', size: 1.1, head: 'mutant', weapon: 'fist', spots: true };
const DRAGON = (c: string, c2: string, metal = false): V => ({ id: metal ? 'mechdragon' : 'dragon', shape: 'dragon', c, c2, eye: metal ? '#40f0ff' : '#f0d040', metal });
const SERPENT = (c: string): V => ({ id: 'longdragon', shape: 'serpent', c, c2: '#f0e0a0', eye: '#f0d040', mane: true });
const DRONE: V = { id: 'drone', shape: 'drone', c: '#5a6270', c2: '#ff3040', eye: '#ff3040', metal: true };
const MECH: V = { id: 'mech', shape: 'man', c: '#7a8494', c2: '#3a4250', eye: '#ff3040', size: 1.2, head: 'robot', weapon: 'cannon', metal: true };
const ROBOT: V = { id: 'robot', shape: 'man', c: '#c8c8c0', c2: '#e8a030', eye: '#40f0ff', head: 'robot', weapon: 'claws', metal: true };
const GOLEM: V = { id: 'golem', shape: 'man', c: '#8a8070', c2: '#5a5448', eye: '#60f0a0', size: 1.25, head: 'stone', weapon: 'fist' };
const CLOCK: V = { id: 'automaton', shape: 'man', c: '#b8903a', c2: '#6a4a2a', eye: '#ffb040', head: 'robot', weapon: 'sword', metal: true };
const KARAKURI: V = { id: 'karakuri', shape: 'man', c: '#e8dcc8', c2: '#a83a2a', eye: DARK, size: 0.85, head: 'robot', weapon: 'katana' };
const man = (id: string, c: string, c2: string, hat: Hat, weapon: Weapon, extra: Partial<V> = {}): V => ({ id, shape: 'man', c, c2, eye: DARK, head: 'human', hat, weapon, ...extra });

// 追加の姿 (和・仙侠・宇宙・現代・砂漠)
const NUE: V = { id: 'nue', shape: 'quad', c: '#c89a4a', c2: '#3a2a20', eye: '#f0e040', stripes: true, snake: true, mane: true, aura: '#6a4a9a' };
const TSUCHIGUMO: V = { id: 'tsuchigumo', shape: 'legs', c: '#3a3020', c2: '#d8b040', eye: '#f0e040', size: 1.2, stripes: true, many: true };
const TENGU: V = { id: 'tengu', shape: 'man', c: '#c83a2a', c2: '#ece6dc', eye: '#f0e040', head: 'tengu', weapon: 'fan', wings: true };
const OCHIMUSHA: V = { id: 'ochimusha', shape: 'man', c: '#9a9a80', c2: '#4a3a3a', eye: '#f0f080', head: 'zombie', hat: 'kabuto', weapon: 'katana', arrows: true };
const NINETAIL: V = { id: 'ninetail', shape: 'quad', c: '#f0e8d8', c2: '#f0c040', eye: '#e04040', size: 1.15, tail: true, tails: 5, aura: '#f0c040' };
const STONELION: V = { id: 'stonelion', shape: 'quad', c: '#9a948a', c2: '#6a645a', eye: '#60f0a0', size: 1.1, mane: true, spots: true };
const EVILCULT: V = { id: 'evilcultivator', shape: 'man', c: '#2a3a2a', c2: '#6a1a2a', eye: '#60ff80', head: 'human', hat: 'hood', weapon: 'sword', aura: '#60ff80' };
const CENTIPEDE: V = { id: 'gu', shape: 'centipede', c: '#5a2a5a', c2: '#e0c040', eye: '#60ff40' };
const JIANGSHI: V = { id: 'jiangshi', shape: 'man', c: '#8aa0a8', c2: '#2a3a6a', eye: DARK, head: 'zombie', hat: 'qing', weapon: 'fist', reach: true, ofuda: true };
const SECBOT: V = { id: 'secbot', shape: 'man', c: '#e8e8ec', c2: '#d02a2a', eye: '#ff3030', head: 'robot', weapon: 'gun', metal: true, siren: true };
const PIRATEMECH: V = { id: 'piratemech', shape: 'man', c: '#8a6a4a', c2: '#2a2a2a', eye: '#f0c040', size: 1.15, head: 'robot', weapon: 'cannon', metal: true, spots: true };
const PARASITE: V = { id: 'parasite', shape: 'slime', c: '#b04a6a', c2: '#ffffff', eye: '#f0e040', tendrils: true };
const GREY: V = { id: 'greyalien', shape: 'man', c: '#a8acb4', c2: '#4a5a7a', eye: DARK, size: 0.8, head: 'grey', weapon: 'gun' };
const ORC: V = { id: 'dungeonorc', shape: 'man', c: '#6a8a4a', c2: '#5a4030', eye: '#f0d040', size: 1.1, head: 'orc', weapon: 'axe', tusks: true };
const SHADE: V = { id: 'shade', shape: 'ghost', c: '#18121e', c2: '#3a2a4a', eye: '#ff3040', ghostly: true, many: true };
const YAKUZA: V = { id: 'yakuza', shape: 'man', c: '#2a2a30', c2: '#1a1a20', eye: DARK, head: 'human', hat: 'shades', weapon: 'gun' };
const SANDWORM: V = { id: 'sandworm', shape: 'worm', c: '#c8a070', c2: '#8a6a40', eye: '#f0e8d0' };
const KINGSCORPION: V = { ...SCORPION, id: 'kingscorpion', c: '#7a2a2a', c2: '#3a1a1a', eye: '#f0e040', size: 1.25 };
const MUMMY: V = { id: 'mummy', shape: 'man', c: '#d8ccb0', c2: '#b8ac90', eye: '#f0e040', head: 'mummy', weapon: 'fist', reach: true };
const DJINN: V = { id: 'djinn', shape: 'ghost', c: '#4a7ad0', c2: '#80c0ff', eye: '#f0e040', ghostly: true };
const RIDER: V = { id: 'riderbandit', shape: 'rider', c: '#c8b080', c2: '#8a5a3a', eye: DARK, weapon: 'scimitar' };

const FANTASY: WorldId[] = ['medieval', 'dark', 'game', 'academy', 'myth', 'frontier', 'beast', 'desert', 'ocean'];
function variants(w: WorldId, foe: Foe): V[] {
  const east = w === 'wa' || w === 'xianxia', tech = w === 'cyberpunk' || w === 'space' || w === 'modern';
  switch (foe) {
    case 'monster':
      if (w === 'wa') return [KASA, KAPPA, ONI, NUE, TSUCHIGUMO, TENGU, KARAKURI];
      if (w === 'xianxia') return [SPIRIT, { ...SPIRIT, id: 'firefox', c: '#e86a2a', c2: '#ffd040', aura: '#ff8030', horns: false }, SERPENT('#3a8a6a'), NINETAIL, STONELION, CENTIPEDE];
      if (w === 'space') return [BUG, SLIME('#b060e0'), KRAKEN, PARASITE, GREY];
      if (w === 'cyberpunk') return [MUTANT, CYBERDOG, SLIME('#40e0a0')];
      if (w === 'modern') return [YUREI, ZOMBIE, SPIDER, ORC, GOLEM, SHADE, VOIDDEMON];
      if (w === 'postapoc') return [MUTANT, HOUND, SCORPION];
      if (w === 'steampunk') return [{ ...SPIDER, id: 'clockspider', c: '#a8803a', c2: '#6a4a2a', eye: '#ffb040' }, SLIME('#60c060'), GOBLIN];
      if (w === 'desert') return [SLIME('#5ab0e0'), GOBLIN, WOLF('#6a6a78'), SCORPION, SANDWORM, KINGSCORPION, MUMMY];
      return [SLIME(w === 'dark' ? '#6a3a8a' : '#5ab0e0'), GOBLIN, WOLF('#6a6a78'), w === 'ocean' ? KRAKEN : SPIDER];
    case 'beast':
      if (w === 'wa') return [TIGER, BOAR, WOLF('#9a8a7a', '#e8c040'), NUE];
      if (w === 'xianxia') return [TIGER, BOAR, SPIRIT, STONELION, CENTIPEDE];
      if (w === 'desert') return [SCORPION, WOLF('#c8a060', '#e8c040'), SANDWORM, KINGSCORPION];
      if (w === 'ocean') return [CRAB, KRAKEN];
      if (w === 'space') return [{ ...WOLF('#6a4a9a', '#40ffe0'), id: 'alienbeast', spots: true, horns: true }, BUG, PARASITE];
      if (w === 'postapoc') return [HOUND, BOAR];
      if (tech) return [WOLF('#4a4a50', '#f0d040'), BEAR, CYBERDOG];
      return [WOLF('#7a7a82'), BEAR, BOAR];
    case 'bandit':
      if (w === 'wa') return [man('nobushi', '#4a4a5a', '#2a2a30', 'kasa', 'katana'), OCHIMUSHA];
      if (w === 'xianxia') return [man('robber', '#3a3a3a', '#8a2a2a', 'bandana', 'scimitar'), EVILCULT];
      if (w === 'desert') return [man('desertbandit', '#c8b080', '#6a4a2a', 'turban', 'scimitar'), RIDER];
      if (w === 'ocean') return [man('pirate', '#a8343e', '#2a2a30', 'bandana', 'scimitar')];
      if (w === 'cyberpunk') return [man('ganger', '#2a2a34', '#ff40c0', 'mohawk', 'gun'), man('streetsamurai', '#3a3a44', '#40e0f0', 'visor', 'katana')];
      if (w === 'space') return [man('spacepirate', '#5a4a3a', '#d0a040', 'visor', 'gun'), PIRATEMECH];
      if (w === 'modern') return [man('thug', '#3a3a3a', '#2a3a5a', 'cap', 'club'), YAKUZA];
      if (w === 'postapoc') return [man('raider', '#5a4a3a', '#8a8a8a', 'mohawk', 'rifle', { spots: false }), man('masked', '#4a4a3a', '#6a6248', 'gasmask', 'club')];
      if (w === 'steampunk') return [man('sneak', '#4a3a30', '#2a2a2a', 'cap', 'gun')];
      return [man('bandit', '#4a5a3a', '#3a3028', 'hood', 'dagger'), man('brigand', '#6a4a3a', '#3a3028', 'bandana', 'club')];
    case 'soldier':
      if (w === 'wa') return [man('ashigaru', '#3a3a4a', '#8a2a2a', 'jingasa', 'spear'), KARAKURI, OCHIMUSHA];
      if (w === 'xianxia') return [man('guard', '#8a2a2a', '#d8b050', 'helm', 'spear')];
      if (w === 'steampunk') return [man('rifleman', '#3a4a7a', '#d8b050', 'shako', 'rifle')];
      if (w === 'cyberpunk') return [man('security', '#2a2a30', '#40c0d0', 'visor', 'gun', { metal: true })];
      if (w === 'space') return [man('trooper', '#d8d8d0', '#3a6ab0', 'visor', 'rifle', { metal: true, size: 1.05 }), SECBOT];
      if (w === 'modern') return [man('soldier', '#5a6a3a', '#3a4028', 'helm', 'rifle')];
      if (w === 'postapoc') return [man('militia', '#6a6248', '#3a3a30', 'gasmask', 'rifle')];
      return [man('spearman', '#8a8a96', '#7a2a2a', 'helm', 'spear', { shield: true })];
    case 'undead':
      if (w === 'wa') return [YUREI, SKELETON, OCHIMUSHA];
      if (w === 'xianxia') return [JIANGSHI, SKELETON, WRAITH];
      if (w === 'desert') return [MUMMY, SKELETON, WRAITH];
      if (tech || w === 'postapoc') return [ZOMBIE, YUREI];
      return [SKELETON, WRAITH, ZOMBIE];
    case 'dragon':
      if (east) return [SERPENT(w === 'wa' ? '#3a6a9a' : '#c8a030')];
      if (tech || w === 'steampunk') return [DRAGON('#6a7280', '#40e0f0', true)];
      if (w === 'postapoc') return [{ ...DRAGON('#7a8a5a', '#a04a3a'), spots: true }];
      return [DRAGON('#b0402a', '#e8c070'), DRAGON('#3a7a4a', '#d0d080'), DRAGON('#3a3440', '#a03030')];
    case 'demon':
      if (w === 'wa') return [ONI, BLUEONI, TENGU];
      if (w === 'xianxia') return [{ ...DEMON, id: 'demoncultivator', wings: false, weapon: 'scimitar', c: '#c8b0c8', c2: '#2a1a2a', aura: '#ff4060' }, EVILCULT];
      if (w === 'desert') return [DEMON, DJINN];
      if (tech) return [VOIDDEMON];
      return [DEMON];
    case 'machine':
      if (w === 'wa') return [KARAKURI];
      if (w === 'steampunk') return [CLOCK, { ...DRONE, id: 'ornithopter', c: '#b8903a', c2: '#ffb040', eye: '#ffb040' }];
      if (FANTASY.includes(w) || w === 'xianxia') return [GOLEM, CLOCK];
      if (w === 'space') return [DRONE, MECH, ROBOT, SECBOT, PIRATEMECH];
      if (w === 'modern') return [DRONE, MECH, ROBOT, GOLEM];
      return [DRONE, MECH, ROBOT];
  }
}

export function enemyFor(world: WorldId, foe: Foe, seed: number): EnemySpec {
  return { world, foe, seed };
}
const variantOf = (e: EnemySpec): V => { const vs = variants(e.world, e.foe); return vs[hash(e.seed, 0xe7e) % vs.length]; };
// 開発用・ログ用の名前
export const enemyKind = (e: EnemySpec): string => variantOf(e).id;

// ---- 描く ----
interface St { dx: number; dy: number; arm: 'down' | 'up' | 'out'; hurt: boolean; open: boolean; fx: boolean }
interface Pen {
  px: (x: number, y: number, c: string, g?: number, raw?: boolean) => void;
  box: (x: number, y: number, w: number, h: number, c: string, g?: number) => void;
  ell: (cx: number, cy: number, rx: number, ry: number, col: (x: number, y: number, l: number) => string, g?: number) => void;
  line: (pts: number[][], w: number, c: string, g?: number) => void;
}
// 攻撃の当たる場所と種類 (描き方が返す)
type Hit = [number, number, 'slash' | 'claw' | 'fire' | 'shot' | 'laser' | 'magic' | 'splash'];

export function paintEnemy(e: EnemySpec, pose: EnemyPose, frame = 0): Pix {
  const v = variantOf(e);
  const fr = frame & 1;
  const st: St = { dx: 0, dy: 0, arm: 'down', hurt: pose === 'hurt' || pose === 'down', open: false, fx: false };
  if (pose === 'idle') st.dy = fr;
  if (pose === 'attack') { st.dx = fr ? -3 : 2; st.arm = fr ? 'out' : 'up'; st.open = !!fr; st.fx = !!fr; }
  if (pose === 'hurt') { st.dx = 3; st.open = true; }
  const P = new Pix(ENEMY_W, ENEMY_H);
  const glass = new Uint8Array(ENEMY_W * ENEMY_H);
  let ox = st.dx, oy = st.dy;
  const px: Pen['px'] = (x, y, c, g = 0, raw = false) => {
    x = Math.floor(x + ox); y = Math.floor(y + oy);
    if (x < 0 || y < 0 || x >= ENEMY_W || y >= ENEMY_H) return;
    P.px(x, y, c, 1, raw); glass[y * ENEMY_W + x] = g;
  };
  const box: Pen['box'] = (x, y, w, h, c, g = 0) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) px(x + xx, y + yy, c, g); };
  const ell: Pen['ell'] = (cx, cy, rx, ry, col, g = 0) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d > 1) continue;
      const c = col(x, y, (x - cx) / rx * 0.6 - (y - cy) / ry * 0.6);
      if (c) px(x, y, c, g);
    }
  };
  const line: Pen['line'] = (pts, w, c, g = 0) => {
    for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t <= 1; t += 0.06) {
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      for (let yy = Math.round(y - w / 2); yy < y + w / 2; yy++) for (let xx = Math.round(x - w / 2); xx < x + w / 2; xx++) px(xx, yy, c, g);
    }
  };
  const pen: Pen = { px, box, ell, line };
  const shapes: Record<Shape, (v: V, p: Pen, st: St) => Hit> = { man: paintMan, quad: paintQuad, legs: paintLegs, slime: paintSlime, ghost: paintGhost, dragon: paintDragon, serpent: paintSerpent, drone: paintDrone, kasa: paintKasa, kraken: paintKraken, centipede: paintCentipede, worm: paintWorm, rider: paintRider };
  const hit = shapes[v.shape](v, pen, st);
  outline(P);
  if (st.fx) { ox = 0; oy = 0; hitFx(hit, pen); }
  for (let i = 0; i < glass.length; i++) if (glass[i]) P.d[i * 4 + 3] = glass[i] === 1 ? 170 : 130;
  if (pose !== 'down') return P;
  // 倒れた姿: 人型は寝かせる、四つ足と虫は裏返す、柔らかいものはつぶす
  if (v.shape === 'man' || v.shape === 'ghost' || v.shape === 'kasa') return layDown(P);
  return v.shape === 'slime' || v.shape === 'kraken' || v.shape === 'drone' || v.shape === 'worm' ? squash(P) : flip(P);
}

const ton = (c: string) => tones(c);
const shade = (t: string[]) => (_x: number, _y: number, l: number) => t[l > 0.3 ? 2 : l < -0.35 ? 0 : 1];
// 目: hurt なら ×
function eye(p: Pen, x: number, y: number, c: string, st: St, big = false): void {
  if (st.hurt) { p.px(x - 1, y - 1, DARK); p.px(x + 1, y + 1, DARK); p.px(x, y, DARK); p.px(x + 1, y - 1, DARK); p.px(x - 1, y + 1, DARK); return; }
  if (big) p.box(x - 1, y - 1, 2, 2, c); else p.px(x, y, c, 0, c !== DARK);
  if (big) p.px(x - 1, y - 1, '#ffffff');
}

// ---- 人型 ----
function paintMan(v: V, p: Pen, st: St): Hit {
  const k = v.size ?? 1, H = Math.round(36 * k), head = Math.round(H * 0.3), body = Math.round(H * 0.36), leg = H - head - body;
  const w = 2 * Math.round(7 * k + (v.metal || v.head === 'stone' ? 2 : 0)), cx = 24, x0 = cx - w / 2, x1 = cx + w / 2 - 1;
  const legTop = 48 - leg, top = legTop - body, hb = top + 1, ht = hb - head + 1, hw = 2 * Math.round(head * 0.5);
  const sk = ton(v.c), cl = ton(v.c2), bone = v.bones;
  const skin = v.head === 'human' ? ton(v.metal ? '#c8a080' : '#d4a07e') : sk;
  const armor = v.head === 'human' ? ton(v.c) : v.head === 'robot' || v.head === 'stone' || v.head === 'oni' ? sk : cl;
  const legC = v.head === 'human' || v.head === 'oni' ? cl : armor;
  // 背中: 翼・尾・甲羅
  if (v.wings) for (const s of [-1, 1]) for (let i = 0; i < 9; i++) p.line([[s < 0 ? x0 + 2 : x1 - 2, top + 2], [cx + s * (w / 2 + 3 + i * 0.6), top - 8 + i * 1.6]], 1, i % 3 ? '#2a1a2a' : '#4a2a3a');
  if (v.tail) p.line([[x1, legTop], [x1 + 6, legTop + 3], [x1 + 9, legTop - 2]], 1, sk[0]);
  if (v.head === 'kappa') p.ell(x1, top + body / 2, 4, body / 2 + 1, shade(ton('#6a5a3a')));
  if (v.aura) { const ay = (ht + 47) / 2, rx = w / 2 + 6, ry = (48 - ht) / 2 + 2; p.ell(cx, ay, rx, ry, (x, y) => (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - ay) / ry) ** 2 < 0.7 ? '' : (x + y) % 3 ? v.aura! : mixc(v.aura!, '#ffffff', 0.5)), 2); }
  // 脚
  const lw = Math.max(2, w / 2 - 2);
  for (const lx of [cx - 1 - lw, cx + 1]) {
    if (bone) { p.box(lx + 1, legTop, 2, leg, BONE); p.box(lx, 46, 3, 2, BONE); continue; }
    p.box(lx, legTop - 1, lw, leg + 1, legC[lx < cx ? 0 : 1]);
    if (v.head === 'oni') for (let y = legTop + 1; y < 46; y += 3) p.box(lx, y, lw, 1, '#2a2028');
    p.box(lx - (lx < cx ? 1 : 0), 46, lw + 1, 2, v.metal ? STEEL : '#3a2a22');
  }
  // 胴
  if (bone) { p.box(cx - 1, top, 2, body, BONE); for (let y = top + 1; y < legTop - 2; y += 2) p.box(x0 + 1, y, w - 2, 1, BONE); p.box(x0 + 1, legTop - 2, w - 2, 2, BONE); }
  else for (let y = top; y < legTop + (v.head === 'human' && v.hat === 'hood' ? 3 : 0); y++) for (let x = x0; x <= x1; x++) if (!(y === top && (x === x0 || x === x1))) p.px(x, y, armor[x < x0 + 2 ? 0 : x > x1 - 2 ? 2 : 1]);
  if (!bone) { p.box(x0, legTop - 2, w, 1, v.head === 'human' ? cl[0] : DARK); if (v.metal) { p.box(cx - 1, top + 2, 2, body - 5, v.eye, 0); p.px(cx - 1, top + 2, '#ffffff', 0, true); } }
  if (v.spots) for (const [dx, dy] of [[2, 3], [w - 4, 6], [4, 9]]) p.box(x0 + dx, top + dy, 2, 2, mixc(v.c, '#5a3a2a', 0.5));
  if (v.head === 'stone') for (let y = top + 2; y < legTop; y += 4) p.box(x0 + 1 + (y % 8 ? 0 : 3), y, 3, 1, sk[0]);
  // 頭
  const hcx = cx - 1, hc = (ht + hb) / 2;
  const face = v.head === 'skull' ? ton(BONE) : skin;
  if (v.head === 'robot' || v.head === 'stone') { p.box(hcx - hw / 2, ht, hw, head, sk[1]); p.box(hcx - hw / 2, ht, hw, 1, sk[2]); p.box(hcx - hw / 2, hb - 1, hw, 1, sk[0]); }
  else p.ell(hcx, hc, hw / 2 + (v.head === 'oni' ? 1 : 0), head / 2, shade(face));
  const ey = Math.round(hc), exL = hcx - Math.round(hw * 0.3) - 1, exR = hcx + 1;
  if (v.head === 'goblin') { for (const s of [-1, 1]) p.line([[hcx + s * hw / 2, ey], [hcx + s * (hw / 2 + 5), ey - 3]], 2, sk[1]); p.box(exL - 1, ey + 1, 3, 2, sk[2]); }
  if (v.head === 'kappa') { p.ell(hcx, ht + 1, hw / 2 - 1, 2, () => '#e8e4d8'); p.box(exL - 2, ey + 2, 5, 2, '#e8b030'); for (let x = hcx - hw / 2; x <= hcx + hw / 2; x += 2) p.px(x, ht + 3, '#3a6a3a'); }
  if (v.head === 'oni' || v.head === 'demon') { p.line([[hcx - 3, ht + 1], [hcx - 4, ht - 4]], 2, '#e8d8a0'); p.line([[hcx + 3, ht + 1], [hcx + 4, ht - 4]], 2, '#e8d8a0'); if (v.head === 'oni') for (let x = hcx - hw / 2 - 1; x <= hcx + hw / 2 + 1; x++) p.box(x, ht - 1 + (x % 2), 1, 3, '#2a2028'); }
  if (v.head === 'mutant') { p.ell(hcx + 3, ht + 2, 3, 2, shade(ton(mixc(v.c, '#a04a3a', 0.4)))); }
  if (v.head === 'zombie' && !v.hat) { p.box(hcx + 1, ht + 2, 3, 1, '#5a3a3a'); p.box(hcx - hw / 2, ht, hw, 2, '#3a3028'); }
  if (v.head === 'tengu') { p.line([[hcx - 2, ey + 1], [hcx - 7, ey + 2]], 2, sk[2]); p.box(hcx - 2, ht - 2, 4, 3, '#1a1a20'); p.box(hcx - hw / 2, ht + 1, hw, 2, '#e8e8e8'); }
  if (v.head === 'orc') { for (const s of [-1, 1]) p.line([[hcx + s * hw / 2, ey], [hcx + s * (hw / 2 + 3), ey - 2]], 2, sk[1]); p.box(hcx - hw / 2, ht, hw, 2, '#2a2018'); }
  if (v.head === 'mummy') for (let y = ht + 1; y < hb; y += 2) p.box(hcx - hw / 2, y, hw, 1, sk[0]);
  if (v.head === 'grey') { p.ell(hcx, ht + 1, hw / 2 + 2, head / 2 + 1, shade(sk)); for (const s of [-1, 1]) p.ell(hcx + s * 3 - 0.5, ey, 2.2, 1.6, () => '#0e0a14'); }
  // 目・口
  if (v.head === 'skull') { p.box(exL, ey - 1, 2, 2, DARK); p.box(exR, ey - 1, 2, 2, DARK); if (!st.hurt) { p.px(exL, ey - 1, v.eye, 0, true); p.px(exR, ey - 1, v.eye, 0, true); } for (let x = hcx - 2; x < hcx + 2; x++) p.px(x, hb - 1, x % 2 ? DARK : BONE); }
  else if (v.head === 'grey') { if (st.hurt) eye(p, hcx - 1, ey, v.eye, st); }
  else if (v.head === 'robot' || v.head === 'stone') { if (st.hurt) eye(p, hcx - 1, ey, v.eye, st); else { p.box(hcx - hw / 2 + 1, ey - 1, hw - 2, 2, DARK); p.box(exL, ey - 1, 2, 1, v.eye); p.px(exL, ey - 1, '#ffffff', 0, true); p.box(exR, ey - 1, 2, 1, v.eye); } }
  else {
    eye(p, exL + 1, ey, v.eye, st, v.head !== 'human'); eye(p, exR + 1, ey, v.eye, st, v.head !== 'human');
    if (v.head !== 'kappa') p.box(exL + 1, hb - 2, st.open ? 3 : 2, st.open ? 2 : 1, st.open ? '#5a1a1a' : skin[0]);
    if (v.head === 'oni' || v.head === 'demon' || v.tusks) { p.px(exL + 1, hb - 3, '#ffffff'); p.px(exR + 1, hb - 3, '#ffffff'); }
    if (v.head === 'mutant') p.box(exR, ey - 2, 3, 3, v.eye);
  }
  hat(v, p, hcx, ht, hb, hw, ey);
  if (v.ofuda) { p.box(hcx - 1, ht + 1, 3, ey - ht + 3, '#f0e080'); p.box(hcx, ht + 2, 1, ey - ht, '#c02a2a'); }
  if (v.siren) { p.box(hcx - 2, ht - 2, 2, 2, '#ff3030', 0); p.box(hcx, ht - 2, 2, 2, '#3060ff', 0); p.px(hcx - 2, ht - 2, '#ffffff', 0, true); }
  if (v.arrows) for (const [dx, dy] of [[2, 4], [w - 3, 8]]) { p.line([[x0 + dx, top + dy], [x0 + dx + 4, top + dy - 6]], 1, WOOD); p.box(x0 + dx + 4, top + dy - 7, 2, 2, '#e8e0d0'); }
  // 腕と武器 (左手が武器)
  const ac = bone ? BONE : v.head === 'human' ? armor[0] : armor[0], hand = bone ? BONE : skin[1];
  let hx = x0 - 2, hy = top + body - 2;
  if (v.reach && st.arm === 'down') st = { ...st, arm: 'out' };
  if (st.arm === 'up') { p.box(x0 - 3, top - 4, 2, 6, ac); hx = x0 - 3; hy = top - 5; }
  else if (st.arm === 'out') { p.box(x0 - 7, top + 1, 7, 2, ac); hx = x0 - 8; hy = top + 1; }
  else p.box(x0 - 2, top + 1, 2, body - 3, ac);
  p.box(x1 + 1, top + 1, 2, body - 3, bone ? BONE : armor[2]); p.box(x1 + 1, top + body - 2, 2, 2, hand);
  if (v.shield) { p.ell(x1 + 2, top + body / 2 + 1, 4, 5, shade(ton('#7a2a2a'))); p.box(x1 + 1, top + body / 2 - 1, 2, 4, '#d8b050'); }
  const hit = weapon(v.weapon ?? 'fist', p, hx, hy, st);
  p.box(hx, hy, 2, 2, hand);
  return hit;
}

function hat(v: V, p: Pen, cx: number, ht: number, hb: number, hw: number, ey: number): void {
  const c = ton(v.c), c2 = ton(v.c2), L = cx - hw / 2, R = cx + hw / 2;
  switch (v.hat) {
    case 'hood': p.ell(cx, (ht + hb) / 2, hw / 2 + 1, (hb - ht) / 2 + 1, (x, y) => (y > ht + 3 && x > L && x < R - 1 && y < hb ? '' : c[x < cx ? 0 : 1])); p.box(L + 1, ht + 4, hw - 2, 3, '#14101a'); p.px(L + 3, ey, '#f0e080', 0, true); p.px(L + 6, ey, '#f0e080', 0, true); break;
    case 'jingasa': for (let i = 0; i < 4; i++) p.box(cx - 3 - i * 2.5, ht - 2 + i, 6 + i * 5, 1, i === 3 ? c2[0] : '#2a2a30'); break;
    case 'kasa': for (let i = 0; i < 6; i++) p.box(cx - 2 - i * 1.8, ht - 3 + i, 4 + i * 3.6, 1, i === 5 ? '#a8883a' : '#c8a850'); p.box(L, ey - 1, hw, 1, '#a8883a'); break;
    case 'helm': p.ell(cx, ht + 2, hw / 2 + 1, 4, shade(ton(STEEL))); p.box(L - 1, ht + 4, hw + 2, 1, '#6a7280'); p.box(cx - 3, ht + 4, 1, 4, '#6a7280'); break;
    case 'visor': p.ell(cx, (ht + hb) / 2, hw / 2 + 1, (hb - ht) / 2 + 1, shade(c)); p.box(L, ey - 1, hw - 1, 3, '#1a2030'); p.box(L, ey, hw - 2, 1, v.c2 === '#3a6ab0' ? '#80c0ff' : v.c2); break;
    case 'bandana': p.box(L - 1, ht, hw + 2, 3, c2[1]); p.box(R, ht + 2, 2, 3, c2[1]); if (v.id === 'pirate') { p.box(cx - 4, ey - 1, 3, 2, DARK); } break;
    case 'turban': p.ell(cx, ht + 1, hw / 2 + 1, 4, (x, y) => ((x + y) % 3 ? '#e8e0d0' : '#c8bca4')); p.box(L, ey + 1, hw, hb - ey - 1, '#d8ccb0'); break;
    case 'mohawk': for (let i = 0; i < 6; i++) p.box(cx - 1, ht - 5 + i, 2, 1, v.c2 === '#ff40c0' ? '#ff40c0' : '#c03a2a'); p.box(cx - 1, ht - 5, 2, 6, v.c2 === '#ff40c0' ? '#ff40c0' : '#c03a2a'); break;
    case 'gasmask': p.box(L + 1, ey - 1, hw - 2, hb - ey + 1, '#4a4a42'); p.box(L + 1, ey - 1, 3, 2, '#9ac0b0'); p.box(cx + 1, ey - 1, 3, 2, '#9ac0b0'); p.box(cx - 2, hb - 2, 3, 3, '#2a2a28'); break;
    case 'shako': p.box(L, ht - 5, hw, 7, '#1a1a24'); p.box(L, ht + 1, hw, 1, '#d8b050'); p.box(cx - 1, ht - 4, 2, 2, '#d8b050'); break;
    case 'cap': p.box(L, ht, hw, 3, c2[1]); p.box(L - 3, ht + 2, 4, 1, c2[0]); break;
    case 'kabuto': p.ell(cx, ht + 2, hw / 2 + 1, 4, shade(ton('#2a2a34'))); p.box(L - 2, ht + 4, hw + 4, 2, '#3a3a44'); p.line([[cx - 1, ht], [cx - 5, ht - 5]], 1, '#d8b050'); p.line([[cx + 1, ht], [cx + 5, ht - 5]], 1, '#d8b050'); break;
    case 'qing': p.box(L - 1, ht - 1, hw + 2, 4, '#1a1a24'); p.box(L - 2, ht + 2, hw + 4, 1, '#2a2a34'); p.box(cx - 1, ht - 3, 2, 2, '#c02a2a'); break;
    case 'shades': p.box(L, ht, hw, 2, '#14121a'); p.box(L + 1, ey - 1, hw - 2, 2, '#14121a'); p.px(L + 2, ey - 1, '#6a6a80'); break;
    default: break;
  }
}

function weapon(w: Weapon, p: Pen, hx: number, hy: number, st: St): Hit {
  const up = st.arm === 'up';
  switch (w) {
    case 'sword': case 'scimitar': case 'katana':
      p.line([[hx, hy], [hx - (w === 'scimitar' ? 3 : 1), hy - 10]], 1.2, w === 'katana' ? '#d8dce4' : STEEL); p.box(hx - 1, hy - 1, 4, 1, w === 'katana' ? DARK : '#d8b050'); return [hx - 4, hy - 4, 'slash'];
    case 'dagger': p.line([[hx, hy], [hx - 1, hy - 5]], 1, STEEL); return [hx - 4, hy - 2, 'slash'];
    case 'spear': case 'trident':
      p.line([[hx + 2, hy + 8], [hx - 1, hy - 16]], 1, WOOD);
      if (w === 'trident') { p.box(hx - 4, hy - 17, 7, 1, STEEL); for (const d of [-4, -1, 2]) p.box(hx + d, hy - 21, 1, 4, STEEL); } else p.line([[hx - 1, hy - 16], [hx - 1, hy - 20]], 2, STEEL);
      return [hx - 5, hy - 6, 'slash'];
    case 'club': case 'kanabo': { const big = w === 'kanabo' ? 2 : 0; p.line([[hx, hy + 1], [hx - 2, hy - 9 - big]], 2 + big, w === 'kanabo' ? '#3a3440' : WOOD); if (w === 'kanabo') for (let i = 0; i < 4; i++) p.px(hx - 4 - (i & 1) * 3, hy - 4 - i * 2, '#c8c8d0'); return [hx - 5, hy - 4, 'slash']; }
    case 'scythe': p.line([[hx + 3, hy + 12], [hx, hy - 14]], 1, '#3a2a30'); p.line([[hx, hy - 14], [hx - 7, hy - 12], [hx - 10, hy - 8]], 1.5, '#c8ccd8'); return [hx - 6, hy - 4, 'slash'];
    case 'rifle': case 'gun': case 'cannon': {
      const n = w === 'rifle' ? 12 : w === 'cannon' ? 10 : 6, t = w === 'cannon' ? 3 : 2;
      const y = up ? hy + 4 : hy;
      p.box(hx - n + 2, y, n, t, w === 'cannon' ? '#5a6270' : '#2a2a30'); p.box(hx - n + 2, y, n, 1, '#5a5a62'); if (w === 'rifle') p.box(hx + 1, y + 1, 4, 2, '#5a3a2a');
      return [hx - n, y, w === 'cannon' ? 'laser' : 'shot'];
    }
    case 'claws': for (const d of [0, 2]) p.line([[hx + d - 1, hy + 2], [hx + d - 3, hy + 4]], 1, BONE); return [hx - 4, hy + 1, 'claw'];
    case 'fan': p.ell(hx - 2, hy - 4, 3, 4, () => '#4a8a3a'); p.line([[hx, hy], [hx - 2, hy - 3]], 1, WOOD); return [hx - 6, hy - 4, 'magic'];
    case 'axe': p.line([[hx, hy + 2], [hx - 1, hy - 10]], 1.5, WOOD); p.ell(hx - 3, hy - 9, 3, 3.5, shade(ton(STEEL))); return [hx - 6, hy - 4, 'slash'];
    default: return [hx - 3, hy + 1, 'claw'];
  }
}

// ---- 四つ足 ----
function paintQuad(v: V, p: Pen, st: St): Hit {
  const k = v.size ?? 1, c = ton(v.c), bl = 13 * k, bh = 7 * k, by = 47 - 6 - bh + (st.arm === 'up' ? 1 : 0), cx = 26;
  if (v.aura) p.ell(cx - 2, by, bl + 6, bh + 6, (x, y) => (((x + 0.5 - cx + 2) / (bl + 6)) ** 2 + ((y + 0.5 - by) / (bh + 6)) ** 2 < 0.72 ? '' : (x + y) % 5 ? v.aura! : '#ffffff'), 2);
  if (v.tail) for (let i = 0; i < (v.tails ?? 1); i++) { const a = (i - ((v.tails ?? 1) - 1) / 2) * 3; p.line([[cx + bl - 2, by - 2], [cx + bl + 4, by - 6 + a], [cx + bl + 7, by - 4 + a * 1.6]], v.id === 'spiritbeast' || v.id === 'firefox' || v.tails ? 4 : 2, i & 1 ? v.c2 : v.c); }
  if (v.snake) { p.line([[cx + bl - 2, by - 1], [cx + bl + 4, by - 4], [cx + bl + 3, by - 10], [cx + bl + 6, by - 13]], 2, '#4a7a3a'); p.box(cx + bl + 5, by - 15, 3, 2, '#4a7a3a'); p.px(cx + bl + 5, by - 15, '#f0e040'); }
  // 脚 (奥の2本は暗く)
  for (const [lx, d] of [[cx - bl + 4, 1], [cx + bl - 5, 1], [cx - bl + 7, 0], [cx + bl - 2, 0]]) p.box(lx, by + bh - 2, 3, 47 - (by + bh - 2) + 1, d ? c[0] : c[1]);
  p.ell(cx, by, bl, bh, (x, y, l) => (v.stripes && x % 4 === 0 ? v.c2 : v.spots && (x * 7 + y * 3) % 11 === 0 ? v.c2 : v.metal && y === Math.round(by) ? v.c2 : c[l > 0.3 ? 2 : l < -0.35 ? 0 : 1]));
  if (v.mane) p.ell(cx - bl + 4, by - 2, 5, bh + 1, (x, y) => ((x + y) % 3 ? v.c2 : c[0]));
  // 頭 (左)
  const hx = cx - bl - 2 - (st.open ? 2 : 0), hy = by - bh + 1 + (st.arm === 'up' ? 2 : 0);
  p.ell(hx + 3, hy, 5.5 * k, 4.5 * k, shade(c));
  p.box(hx - 4, hy, 6, 3, c[1]); p.px(hx - 4, hy, DARK);
  if (st.open) { p.box(hx - 4, hy + 3, 6, 2, c[0]); p.box(hx - 3, hy + 3, 5, 1, '#6a1a1a'); p.px(hx - 3, hy + 2, '#ffffff'); }
  for (const ex of [hx + 4, hx + 7]) p.line([[ex, hy - 3], [ex + 1, hy - 7 * (v.id === 'bear' ? 0.5 : 1)]], 2, c[2]);
  if (v.horns) p.line([[hx + 5, hy - 4], [hx + 9, hy - 10]], 1, '#e8d8a0');
  if (v.tusks) { p.px(hx - 2, hy + 3, '#f0ead8'); p.px(hx - 2, hy + 2, '#f0ead8'); }
  eye(p, hx + 2, hy - 1, v.eye, st);
  return [hx - 6, hy + 2, 'claw'];
}

// ---- 多脚 (蜘蛛・蠍・蟹・虫) ----
function paintLegs(v: V, p: Pen, st: St): Hit {
  const k = v.size ?? 1, c = ton(v.c), cy = 47 - 9 * k, cx = 27;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const bx = cx - 6 + i * 4, kneeY = cy - 8 - (i % 2) * 2 + (st.arm === 'up' ? -2 : 0); p.line([[bx, cy], [bx + s * 5 + (i - 2) * 2, kneeY], [bx + s * 8 + (i - 2) * 3, 47]], 1, s < 0 ? c[0] : c[1]); }
  if (v.stinger) p.line([[cx + 10, cy], [cx + 15, cy - 8], [cx + 12, cy - 16], [cx + 6, cy - 17]], 2.2, v.c);
  if (v.stinger) p.box(cx + 5, cy - 18, 2, 3, '#f0e0a0');
  p.ell(cx + 6, cy - 1, 9 * k, 7 * k, (x, y, l) => ((v.id === 'spider' && (x + y) % 6 === 0) || (v.stripes && x % 4 === 0) ? v.c2 : c[l > 0.3 ? 2 : l < -0.35 ? 0 : 1]));
  p.ell(cx - 5, cy, 6 * k, 5 * k, shade(c));
  if (v.claws) for (const dy of [-1, 1]) { const tx = cx - 15 - (st.open ? 4 : 0); p.line([[cx - 8, cy + dy], [tx + 3, cy - 4 + dy * 2]], 2, c[1]); p.ell(tx, cy - 4 + dy * 3, 3, 2, shade(c)); }
  const ex = cx - 9;
  if (v.id === 'spider' || v.id === 'clockspider' || v.many) { for (const [dx, dy] of [[0, -2], [2, -2], [1, -3], [3, -1]]) eye(p, ex + dx, cy + dy, v.eye, st); }
  else { eye(p, ex, cy - 3, v.eye, st); eye(p, ex + 3, cy - 3, v.eye, st); }
  if (st.open) { p.px(ex - 2, cy + 2, '#ffffff'); p.px(ex, cy + 3, '#ffffff'); }
  return [ex - 6, cy, v.claws ? 'claw' : 'splash'];
}

// ---- ぷよぷよ ----
function paintSlime(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), sq = st.dy ? 1 : 0, rx = 11 + sq, ry = 9 - sq + (st.arm === 'up' ? 2 : 0), cy = 47 - ry, cx = 24;
  p.ell(cx, cy, rx, ry, (x, y, l) => (y >= 46 ? c[0] : l > 0.45 ? c[3] : l < -0.3 ? c[0] : c[1]), 1);
  p.ell(cx + 4, cy - ry / 2, 2.5, 1.5, () => '#ffffff', 0);
  if (v.tendrils) {
    for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.5 + st.dy * 0.15; p.line([[cx + Math.cos(a) * rx * 0.8, cy + Math.sin(a) * ry * 0.8], [cx + Math.cos(a) * (rx + 6), cy + Math.sin(a) * (ry + 6)]], 1, c[0]); }
    p.ell(cx - 2, cy - 1, 4, 3.5, () => '#f8f0e0'); eye(p, cx - 3, cy - 1, v.eye, st, true);
  } else { eye(p, cx - 5, cy - 1, DARK, st, true); eye(p, cx + 1, cy - 1, DARK, st, true); }
  p.box(cx - 3, cy + 3, st.open ? 3 : 2, st.open ? 2 : 1, '#3a1a2a');
  return [cx - 14, cy, 'splash'];
}

// ---- 霊 ----
function paintGhost(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), cx = 24, top = 10, bot = 44;
  for (let y = top; y < bot; y++) { const t = (y - top) / (bot - top), hw = 5 + t * 6; for (let x = Math.floor(cx - hw); x < cx + hw; x++) { if (y > bot - 6 && (x + Math.floor(y / 2)) % 4 === 0) continue; p.px(x, y, x < cx - hw + 2 ? c[0] : c[1], 1); } }
  p.ell(cx, top + 5, 6, 6, shade(c), 1);
  if (v.hair) { p.ell(cx, top + 3, 7, 5, () => v.hair!); p.box(cx - 7, top + 3, 4, 16, v.hair); p.box(cx + 3, top + 3, 4, 16, v.hair); p.box(cx - 3, top + 6, 6, 5, mixc(v.c, '#c8d0e0', 0.5)); eye(p, cx - 2, top + 8, DARK, st); eye(p, cx + 1, top + 8, DARK, st); }
  else if (v.id === 'djinn') {
    p.ell(cx, top + 6, 5, 5.5, shade(ton(mixc(v.c, '#ffffff', 0.25))));
    p.box(cx - 1, top - 4, 3, 4, '#1a1418'); p.box(cx - 2, top - 1, 5, 2, '#d8b050');
    p.box(cx - 4, top + 9, 8, 2, '#1a1418'); p.px(cx - 5, top + 7, '#d8b050'); p.px(cx + 5, top + 7, '#d8b050');
    eye(p, cx - 2, top + 5, v.eye, st); eye(p, cx + 2, top + 5, v.eye, st);
    p.box(cx - 8, top + 15, 16, 2, '#d8b050');
  }
  else { p.ell(cx, top + 5, 6, 6, (x, y) => (y > top + 2 && Math.abs(x - cx + 0.5) < 4 && y < top + 10 ? '#0e0a14' : c[0])); eye(p, cx - 2, top + 6, v.eye, st); eye(p, cx + 1, top + 6, v.eye, st); }
  if (v.many) for (const [dx, dy] of [[-4, 16], [3, 20], [-1, 26], [5, 30], [-6, 32]]) eye(p, cx + dx, top + dy, v.eye, st);
  const hx = cx - 10 - (st.arm === 'out' ? 4 : 0), hy = top + 14 - (st.arm === 'up' ? 6 : 0);
  p.line([[cx - 4, top + 12], [hx + 2, hy]], 2, c[0], 1);
  if (v.weapon === 'scythe') return weapon('scythe', p, hx, hy, st);
  return [hx - 2, hy, 'magic'];
}

// ---- 竜 ----
function paintDragon(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), c2 = ton(v.c2), cx = 28, by = 34;
  const flap = st.dy || st.arm === 'up' ? 4 : 0;
  for (let i = 0; i < 6; i++) p.line([[cx + 2, by - 6], [cx + 4 + i * 2.2, by - 22 + flap + i * 2]], 1, i % 2 ? c[0] : (v.metal ? v.c2 : c2[0]));
  p.line([[cx + 10, by + 4], [cx + 16, by + 8], [cx + 19, by + 2]], 3, v.c);
  for (const lx of [cx - 6, cx + 4]) { p.box(lx, by + 5, 4, 47 - by - 5 + 1, c[0]); p.box(lx - 1, 46, 5, 2, c[0]); }
  p.ell(cx, by, 11, 8, (x, y, l) => (y > by + 2 && x < cx + 4 ? c2[1] : v.spots && (x + y * 3) % 7 === 0 ? v.c2 : c[l > 0.3 ? 2 : l < -0.35 ? 0 : 1]));
  const hx = cx - 15 - (st.open ? 2 : 0), hy = by - 12 + (st.arm === 'up' ? -2 : 0);
  p.line([[cx - 6, by - 2], [hx + 4, hy + 2]], 4, v.c);
  p.ell(hx + 3, hy, 5, 4, shade(c)); p.box(hx - 3, hy, 6, 3, c[1]);
  p.line([[hx + 5, hy - 3], [hx + 9, hy - 7]], 1.5, v.metal ? STEEL : '#e8d8b0');
  if (st.open) p.box(hx - 3, hy + 3, 6, 2, '#6a1a1a');
  if (v.metal) p.box(cx - 4, by - 1, 8, 1, v.c2);
  eye(p, hx + 2, hy - 1, v.eye, st);
  return [hx - 4, hy + 2, v.metal ? 'laser' : 'fire'];
}
function paintSerpent(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), lift = st.arm === 'up' ? -3 : 0;
  const pts: number[][] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([12 + t * 32, 26 + Math.sin(t * 7 + st.dy) * 8 + t * 10 + (1 - t) * lift]); }
  for (let i = 0; i < pts.length - 1; i++) p.line([pts[i], pts[i + 1]], 6 - i * 0.2, i % 3 ? v.c : c[0]);
  for (let i = 1; i < pts.length - 1; i += 2) p.px(pts[i][0], pts[i][1] + 2, v.c2);
  if (v.mane) for (let i = 1; i < 12; i += 2) p.box(pts[i][0], pts[i][1] - 5, 2, 2, '#e8e0d0');
  const [hx, hy] = [pts[0][0] - 2 - (st.open ? 2 : 0), pts[0][1] - 2];
  p.ell(hx + 2, hy, 6, 5, shade(c)); p.box(hx - 5, hy, 6, 3, c[1]);
  p.line([[hx + 3, hy - 3], [hx + 7, hy - 9]], 1.5, '#e8d8a0'); p.line([[hx - 4, hy + 2], [hx - 8, hy + 6], [hx - 6, hy + 9]], 1, '#f0e0a0');
  if (st.open) p.box(hx - 5, hy + 3, 6, 2, '#6a1a1a');
  eye(p, hx + 1, hy - 1, v.eye, st);
  return [hx - 6, hy + 2, 'fire'];
}

// ---- 機械・妖怪・触手 ----
function paintDrone(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), cy = 26 + (st.dy ? 1 : 0), cx = 24;
  p.ell(cx, 46, 9, 1.5, () => '#000000', 1);
  for (const s of [-1, 1]) { p.box(cx + s * 9 - 1, cy - 6, 2, 5, c[0]); p.box(cx + s * 9 - 5, cy - 7, 10, 1, (st.dy ? 1 : 0) ? '#c8ccd8' : '#8a8a96'); }
  p.ell(cx, cy, 10, 5, shade(c));
  p.box(cx - 10, cy, 20, 1, c[0]);
  p.ell(cx - 4, cy + 1, 3, 3, () => DARK); eye(p, cx - 4, cy + 1, v.eye, st, true);
  p.box(cx - 2, cy + 5, 4, 3, c[0]); p.box(cx - 8, cy + 6, 7, 2, '#2a2a30');
  return [cx - 9, cy + 6, 'laser'];
}
function paintKasa(v: V, p: Pen, st: St): Hit {
  const cx = 24, top = 6 + (st.dy ? 1 : 0) - (st.arm === 'up' ? 2 : 0);
  for (let i = 0; i < 22; i++) { const hw = 2 + i * 0.75; for (let x = Math.floor(cx - hw); x < cx + hw; x++) p.px(x, top + i, Math.floor(x - cx) % 4 === 0 ? v.c2 : x < cx - hw / 2 ? mixc(v.c, DARK, 0.3) : v.c); }
  p.line([[cx, top + 22], [cx, 44]], 2, WOOD);
  p.box(cx - 3, 45, 6, 1, WOOD); p.box(cx - 2, 46, 1, 2, WOOD); p.box(cx + 1, 46, 1, 2, WOOD);
  if (st.hurt) eye(p, cx - 1, top + 12, DARK, st); else { p.ell(cx - 1, top + 12, 3.5, 3, () => '#ffffff'); p.box(cx - 2, top + 11, 2, 3, DARK); }
  p.box(cx - 2, top + 17, 3, 2, '#5a1a1a');
  p.line([[cx - 1, top + 19], [cx - 3 - (st.open ? 6 : 2), top + 23]], 2, '#e05a6a');
  return [cx - 12, top + 18, 'splash'];
}
function paintKraken(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), cx = 26, cy = 20 + st.dy;
  for (let i = 0; i < 6; i++) { const bx = cx - 8 + i * 3.2, sw = Math.sin(i * 1.7 + st.dy * 2) * 3; p.line([[bx, cy + 6], [bx + sw, cy + 15], [bx - sw, 44], [bx - sw - (i < 3 ? 3 : -3), 47]], 2.4, i % 2 ? c[1] : c[0]); }
  const reach = st.arm === 'out' ? 10 : st.arm === 'up' ? 4 : 6;
  p.line([[cx - 8, cy + 6], [cx - 8 - reach, cy - 4], [cx - 12 - reach, cy - 8]], 2, v.c);
  p.ell(cx, cy, 10, 11, (x, y, l) => ((x + y * 2) % 7 === 0 ? v.c2 : c[l > 0.3 ? 2 : l < -0.35 ? 0 : 1]));
  eye(p, cx - 5, cy + 3, v.eye, st, true); eye(p, cx + 1, cy + 3, v.eye, st, true);
  return [cx - 14 - reach, cy - 6, 'splash'];
}

// ---- 毒蟲・砂蟲・騎兵 ----
function paintCentipede(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), lift = st.arm === 'up' ? -4 : 0;
  const seg: number[][] = [];
  for (let i = 0; i < 9; i++) { const t = i / 8; seg.push([12 + t * 30, 30 + t * 12 - (1 - t) ** 2 * (8 - lift) + Math.sin(t * 6 + st.dy) * 2]); }
  for (let i = seg.length - 1; i >= 0; i--) {
    const [x, y] = seg[i];
    for (const s of [-1, 1]) p.line([[x, y + 1], [x + s * 2, y + 5], [x + s * 3, Math.min(47, y + 7)]], 1, c[0]);
    p.ell(x, y, 3.2, 2.8, (xx, yy, l) => (yy === Math.round(y) - 2 ? v.c2 : c[l > 0.3 ? 2 : l < -0.35 ? 0 : 1]));
  }
  const [hx, hy] = seg[0];
  p.line([[hx - 2, hy + 1], [hx - 5 - (st.open ? 2 : 0), hy + 3]], 1, '#e0c040'); p.line([[hx - 1, hy + 2], [hx - 4, hy + 5 + (st.open ? 1 : 0)]], 1, '#e0c040');
  p.line([[hx - 1, hy - 2], [hx - 5, hy - 7]], 1, c[2]);
  eye(p, hx - 1, hy - 1, v.eye, st);
  return [hx - 7, hy + 3, 'splash'];
}
function paintWorm(v: V, p: Pen, st: St): Hit {
  const c = ton(v.c), up = st.arm === 'up' ? -3 : 0;
  p.ell(30, 46, 14, 3, (x, y) => ((x + y) % 3 ? '#b89060' : '#d8b080'));
  const pts: number[][] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([32 - t * 14 - Math.sin(t * 3) * 3, 45 - t * (30 - up) + st.dy]); }
  for (let i = 0; i < pts.length; i++) p.ell(pts[i][0], pts[i][1], 5 - i * 0.1, 3, (x, y, l) => (i % 2 ? c[l > 0.2 ? 2 : 1] : c[l > 0.2 ? 1 : 0]));
  const [hx, hy] = pts[pts.length - 1];
  p.ell(hx - 1, hy - 1, 5, 4, shade(c));
  p.ell(hx - 3, hy - 1, 3, 3, () => (st.open ? '#3a0a14' : '#6a2a2a'));
  for (let a = 0; a < 6.28; a += 0.9) p.px(hx - 3 + Math.cos(a) * 3, hy - 1 + Math.sin(a) * 3, v.eye);
  if (st.hurt) eye(p, hx + 1, hy - 3, DARK, st);
  return [hx - 8, hy - 1, 'splash'];
}
function paintRider(v: V, p: Pen, st: St): Hit {
  const horse: V = { id: 'horse', shape: 'quad', c: v.c2, c2: '#2a1a14', eye: DARK, mane: true, tail: true };
  paintQuad(horse, p, { ...st, open: false, hurt: false });
  const sk = ton('#c08a64'), cl = ton(v.c);
  p.box(25, 25, 4, 9, ton('#3a2a20')[0]);
  p.box(22, 17, 8, 10, cl[1]); p.box(22, 17, 2, 10, cl[0]); p.box(22, 25, 8, 1, '#6a4a2a');
  p.ell(25.5, 13, 3.5, 3.5, shade(sk));
  p.ell(25.5, 11, 4, 2.5, (x, y) => ((x + y) % 3 ? '#e8e0d0' : '#c8bca4'));
  p.box(22, 13, 7, 3, '#d8ccb0'); eye(p, 23, 13, DARK, st);
  let hx = 20, hy = 21;
  if (st.arm === 'up') { p.box(21, 12, 2, 6, cl[0]); hx = 21; hy = 11; } else if (st.arm === 'out') { p.box(15, 18, 7, 2, cl[0]); hx = 14; hy = 18; } else p.box(20, 18, 2, 4, cl[0]);
  const hit = weapon(v.weapon ?? 'scimitar', p, hx, hy, st);
  p.box(hx, hy, 2, 2, sk[1]);
  return hit;
}

// ---- 攻撃の光 ----
function hitFx([x, y, k]: Hit, p: Pen): void {
  const g = 2;
  if (k === 'slash') for (let a = -1.4; a <= 1.4; a += 0.1) { p.px(x - Math.cos(a) * 7, y + Math.sin(a) * 9, '#ffffff', g, true); p.px(x + 1 - Math.cos(a) * 6, y + Math.sin(a) * 8, '#fff0b0', g, true); }
  if (k === 'claw') for (let i = 0; i < 3; i++) p.line([[x - 2 + i * 3, y - 5], [x - 5 + i * 3, y + 5]], 1, '#ffffff', g);
  if (k === 'fire') for (let i = 0; i < 14; i++) { const r = i * 0.45; for (let d = -r; d <= r; d++) p.px(x - i, y + d, Math.abs(d) < r * 0.4 ? '#fff0a0' : '#ff7a2a', g, true); }
  if (k === 'shot') { for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [0, 1], [-2, 0], [-1, -1], [-1, 1]]) p.px(x + dx, y + dy, '#fff0a0', g, true); for (let xx = 0; xx < x - 3; xx += 3) p.px(xx, y, '#ffe080', g, true); }
  if (k === 'laser') for (let xx = 0; xx < x; xx++) { p.px(xx, y, '#ffffff', 0, true); p.px(xx, y - 1, '#ff4060', g, true); p.px(xx, y + 1, '#ff4060', g, true); }
  if (k === 'magic') for (let a = 0; a < 6.28; a += 0.6) p.px(x + Math.cos(a) * 4, y + Math.sin(a) * 4, '#c080ff', g, true);
  if (k === 'splash') for (const [dx, dy] of [[0, 0], [-3, -2], [-5, 1], [-2, 3], [-7, -1], [-4, -4]]) p.box(x + dx, y + dy, 2, 2, '#e0f0ff', g);
}

// 倒れた姿の変形
function flip(P: Pix): Pix {
  let b = -1, t = P.h;
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) if (P.d[(y * P.w + x) * 4 + 3]) { t = Math.min(t, y); b = Math.max(b, y); }
  const Q = new Pix(P.w, P.h), off = P.h - 1 - b;
  for (let y = t; y <= b; y++) Q.d.set(P.d.subarray(y * P.w * 4, (y + 1) * P.w * 4), (b + t - y + off) * P.w * 4);
  return Q;
}
function squash(P: Pix): Pix {
  const Q = new Pix(P.w, P.h);
  for (let y = 0; y < P.h; y++) { const sy = P.h - 1 - Math.floor((P.h - 1 - y) * 2.2); if (sy < 0) continue; for (let x = 0; x < P.w; x++) { const sx = Math.round(24 + (x - 24) / 1.25); const i = (sy * P.w + sx) * 4, j = (y * P.w + x) * 4; for (let c = 0; c < 4; c++) Q.d[j + c] = P.d[i + c]; } }
  return Q;
}

// 開発用: 世界ごとに出る姿の数
export const enemyKinds = (): string[] => {
  const all = new Set<string>();
  const W: WorldId[] = ['medieval', 'dark', 'game', 'academy', 'wa', 'xianxia', 'steampunk', 'cyberpunk', 'space', 'modern', 'postapoc', 'ocean', 'desert', 'beast', 'myth', 'frontier'];
  const F: Foe[] = ['monster', 'beast', 'bandit', 'soldier', 'undead', 'dragon', 'demon', 'machine'];
  for (const w of W) for (const f of F) for (const v of variants(w, f)) all.add(v.id);
  return [...all];
};
