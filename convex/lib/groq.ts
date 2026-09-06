import { Classification, DOMAIN_VALUES, DomainValue } from "./gemini";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
];

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

const INSTRUCTIONS = `You sort problems reported by citizens of Jharkhand, India, so they can be sent to the right university department.

Reply with JSON only, using exactly these keys:
domain: one of ${DOMAIN_VALUES.join(", ")}
confidence: a number between 0 and 1
severity: an integer 1 to 5, where 1 is a minor inconvenience, 3 is serious and worsening, 5 is an emergency where people are in immediate danger
affectedEstimate: an integer. A hamlet is around 200, a village 1500, a block 50000. Use the reporter's own number when they give one.
summary: one sentence under 20 words

Judge severity by what is described, not by how upset the writer sounds. Reports may be written in Hindi, Santhali, Ho, Kurukh, Nagpuri, Khortha or English.`;

export function groqAvailable() {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function classifyWithGroq(
  title: string,
  description: string,
  district: string,
): Promise<Classification> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set on this deployment.");

  let lastError = "no model was tried";

  for (const model of GROQ_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: INSTRUCTIONS },
            {
              role: "user",
              content: `District: ${district}\nTitle: ${title}\nReport: ${description}`,
            },
          ],
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = body?.choices?.[0]?.message?.content;
        if (!raw) throw new Error("Groq returned an empty response.");
        return normalise(JSON.parse(raw));
      }

      const detail = (await response.text()).slice(0, 200);
      lastError = `${model} returned ${response.status}: ${detail}`;
      if (!RETRYABLE.has(response.status)) break;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }

  throw new Error(`Groq call failed. Last attempt: ${lastError}`);
}

function normalise(parsed: Record<string, unknown>): Classification {
  const domain = String(parsed.domain ?? "").toLowerCase() as DomainValue;
  if (!DOMAIN_VALUES.includes(domain)) {
    throw new Error(`Groq returned an unknown domain: ${parsed.domain}`);
  }

  return {
    domain,
    confidence: clamp(Number(parsed.confidence), 0, 1),
    severity: Math.round(clamp(Number(parsed.severity), 1, 5)),
    affectedEstimate: Math.max(0, Math.round(Number(parsed.affectedEstimate) || 0)),
    summary: String(parsed.summary ?? ""),
  };
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
