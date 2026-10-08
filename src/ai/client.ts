// OpenAI 互換の chat/completions をブラウザから直接呼ぶ。
// 例外の文にはキーも応答の本文も入れない (HTTP の番号と短い理由だけ)。
import { L } from '../i18n';
import { aiReady, aiSettings, endpoint, type AiSettings } from './settings';

export interface Msg { role: 'system' | 'user' | 'assistant'; content: string }

const TIMEOUT_MS = 60000;

export class AiError extends Error {
  constructor(message: string) { super(message); this.name = 'AiError'; }
}

export async function chat(messages: Msg[], s: AiSettings = aiSettings(), opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  if (!aiReady(s)) throw new AiError(L('AIの設定が足りない(モデル名・キー・URL)', 'AI is not set up (model, key or URL missing)'));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(`${endpoint(s)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
        ...(s.provider === 'openrouter' ? { 'X-Title': 'Random Isekai' } : {}),
      },
      body: JSON.stringify({ model: s.model.trim(), messages, max_tokens: opts.maxTokens ?? 600, temperature: opts.temperature ?? 0.9 }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new AiError(ctrl.signal.aborted
      ? L(`${TIMEOUT_MS / 1000}秒たっても返事がなかった`, `No answer within ${TIMEOUT_MS / 1000}s`)
      : L('つながらなかった(URL・CORS・ネットワーク)', 'Could not connect (URL, CORS or network)'));
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    const why = r.status === 401 || r.status === 403 ? L('キーが通らない', 'key rejected') : r.status === 404 ? L('URLかモデル名が違う', 'wrong URL or model') : r.status === 429 ? L('混んでいる', 'rate limited') : '';
    throw new AiError(`HTTP ${r.status}${why ? ` (${why})` : ''}`);
  }
  let j: { choices?: { message?: { content?: unknown } }[] };
  try { j = await r.json(); } catch { throw new AiError(L('返事がJSONでなかった', 'Reply was not JSON')); }
  const content = j.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new AiError(L('返事が空だった', 'Empty reply'));
  return content;
}

// 考える型のモデルの <think> とコードフェンスを落とし、最初の JSON オブジェクトを取り出す
export function parseJson(text: string): unknown {
  const t = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '');
  const start = t.indexOf('{');
  if (start < 0) throw new AiError(L('返事にJSONがない', 'No JSON in reply'));
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try { return JSON.parse(t.slice(start, i + 1)); } catch { throw new AiError(L('JSONが壊れている', 'Broken JSON')); }
    }
  }
  throw new AiError(L('JSONが閉じていない', 'Unclosed JSON'));
}
