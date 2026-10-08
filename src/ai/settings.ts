// AI の接続設定。この端末の localStorage にだけ保存する (dom.ts の load/save は失敗しても落ちない)。
// API キーは送り先の Authorization ヘッダにだけ使い、ほかのどこにも送らない。
import { load, save } from '../ui/dom';

export type Provider = 'openrouter' | 'local';

export interface AiSettings {
  provider: Provider;
  baseUrl: string; // local のときだけ使う。OpenAI 互換の …/v1 まで
  apiKey: string;
  model: string;   // 既定は空。入れるまで AI は動かない
}

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
export const LOCAL_URL_EXAMPLE = 'http://localhost:1234/v1';
export const OPENROUTER_MODEL_EXAMPLE = 'google/gemini-2.5-flash';

const KEY = 'ai-settings';
const DEFAULTS: AiSettings = { provider: 'openrouter', baseUrl: '', apiKey: '', model: '' };

export function aiSettings(): AiSettings {
  const s = load<Partial<AiSettings>>(KEY, {});
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  return {
    provider: s.provider === 'local' ? 'local' : 'openrouter',
    baseUrl: str(s.baseUrl, DEFAULTS.baseUrl),
    apiKey: str(s.apiKey, DEFAULTS.apiKey),
    model: str(s.model, DEFAULTS.model),
  };
}

export const saveAiSettings = (s: AiSettings): void => save(KEY, s);

// 実際に問い合わせる先
export const endpoint = (s: AiSettings): string => (s.provider === 'openrouter' ? OPENROUTER_URL : s.baseUrl.trim().replace(/\/+$/, ''));

// 使える状態か。OpenRouter はキー必須、手元の LLM は URL 必須 (キーは任意)
export function aiReady(s: AiSettings = aiSettings()): boolean {
  if (!s.model.trim()) return false;
  if (s.provider === 'openrouter') return !!s.apiKey;
  return /^https?:\/\/[^\s]+$/i.test(s.baseUrl.trim());
}
