// その人生がおまかせ転生か (チケットと実績の数え方が変わる)。Hero には持たせず横に置き、続きからの保存にも残す
import type { Hero } from '../engine/types';
import { load, save } from './dom';

const KEY = 'current-random';
const modes = new WeakMap<Hero, boolean>();

export const setRandom = (h: Hero, random: boolean): void => { modes.set(h, random); };
export const isRandom = (h: Hero): boolean => modes.get(h) ?? false;
// 続きから: 保存と読み直し (中断した人生のぶん)
export const saveMode = (h: Hero | null): void => save(KEY, h ? isRandom(h) : null);
export const restoreMode = (h: Hero): void => setRandom(h, load<boolean | null>(KEY, null) === true);
