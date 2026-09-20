import { ClassifierUnavailableError } from './types';

const USER_AGENT = 'akhra-server/1.0 (civic classification service)';

export interface LlmCall {
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  system: string;
  user: string;
  maxTokens?: number;
}

async function post(
  tier: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  call: LlmCall,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), call.timeoutMs);
  try {
    const response = await call.fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT, ...headers },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      if (response.status === 404) {
        throw new ClassifierUnavailableError(
          tier,
          `model "${call.model}" is not available to this key (HTTP 404). Set ${tier.toUpperCase()}_MODEL to a model the provider lists for your key.`,
        );
      }
      throw new ClassifierUnavailableError(tier, `HTTP ${response.status} ${detail.slice(0, 200)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function callGemini(call: LlmCall): Promise<string> {
  const payload = (await post(
    'gemini',
    `https://generativelanguage.googleapis.com/v1beta/models/${call.model}:generateContent`,
    { 'x-goog-api-key': call.apiKey },
    {
      systemInstruction: { parts: [{ text: call.system }] },
      contents: [{ role: 'user', parts: [{ text: call.user }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: call.maxTokens ?? 512,
        responseMimeType: 'application/json',
      },
    },
    call,
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ClassifierUnavailableError('gemini', 'Empty response from model');
  return text;
}

export async function callGroq(call: LlmCall): Promise<string> {
  const payload = (await post(
    'groq',
    'https://api.groq.com/openai/v1/chat/completions',
    { authorization: `Bearer ${call.apiKey}` },
    {
      model: call.model,
      temperature: 0,
      max_tokens: call.maxTokens ?? 512,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: call.system },
        { role: 'user', content: call.user },
      ],
    },
    call,
  )) as { choices?: { message?: { content?: string } }[] };

  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new ClassifierUnavailableError('groq', 'Empty response from model');
  return text;
}
