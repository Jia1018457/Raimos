import fetch from 'node-fetch';

/**
 * Call OpenRouter (or compatible) chat completion API.
 * Returns { content: string, tokens: number }
 */
export async function callAI({ apiKey, apiUrl, model, system, messages, maxTokens = 200 }) {
  const base = (apiUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const body = {
    model: model || 'anthropic/claude-3-haiku',
    max_tokens: maxTokens,
    stream: false,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ],
  };

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://raimos.app',
      'X-Title': 'Raimos Backend',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  const tokens = data.usage?.total_tokens || 0;
  return { content, tokens };
}
