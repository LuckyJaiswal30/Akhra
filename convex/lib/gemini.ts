const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBEDDING_DIMENSIONS = 768;

export const DOMAIN_VALUES = [
  "education",
  "agriculture",
  "healthcare",
  "water",
  "environment",
  "energy",
  "urban",
  "accessibility",
  "governance",
  "livelihoods",
] as const;

export type DomainValue = (typeof DOMAIN_VALUES)[number];

export type Classification = {
  domain: DomainValue;
  confidence: number;
  severity: number;
  affectedEstimate: number;
  summary: string;
};

function apiKey() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set on this Convex deployment.",
    );
  }
  return key;
}

const TEXT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const EMBED_MODELS = ["gemini-embedding-001", "gemini-embedding-2"];

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const ATTEMPTS_PER_MODEL = 2;

function chain(override: string | undefined, defaults: string[]) {
  if (!override) return defaults;
  return [override, ...defaults.filter((m) => m !== override)];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  models: string[],
  method: string,
  body: unknown,
): Promise<{ json: unknown; model: string }> {
  let lastError = "no model was tried";

  for (const model of models) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      const response = await fetch(`${API_ROOT}/${model}:${method}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey(),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return { json: await response.json(), model };
      }

      const detail = (await response.text()).slice(0, 200);
      lastError = `${model} returned ${response.status}: ${detail}`;

      if (!RETRYABLE.has(response.status)) break;
      await sleep(350 * (attempt + 1) + Math.random() * 250);
    }
  }

  throw new Error(`Gemini call failed. Last attempt: ${lastError}`);
}

export async function embedText(text: string): Promise<number[]> {
  const { json } = await callGemini(
    chain(process.env.GEMINI_EMBED_MODEL, EMBED_MODELS),
    "embedContent",
    {
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType: "CLUSTERING",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  );

  const body = json as { embedding?: { values?: number[] } };
  const values: number[] = body?.embedding?.values ?? [];
  if (values.length === 0) throw new Error("Embedding response was empty.");

  return normalize(values.slice(0, EMBEDDING_DIMENSIONS));
}

function normalize(values: number[]): number[] {
  let sum = 0;
  for (const value of values) sum += value * value;
  const magnitude = Math.sqrt(sum);
  if (magnitude === 0) return values;
  return values.map((value) => value / magnitude);
}

const CLASSIFY_INSTRUCTIONS = `You sort problems reported by citizens of Jharkhand, India, so they can be sent to the right university department.

Read the report and return:
- domain: the single best fit from the list.
- confidence: 0 to 1, how sure you are of the domain.
- severity: 1 to 5. 1 is a minor inconvenience, 3 is serious and worsening, 5 is an emergency where people are in immediate danger.
- affectedEstimate: roughly how many people this affects. A hamlet is around 200, a village 1500, a block 50000. Use the reporter's own number when they give one.
- summary: one sentence, under 20 words, that an officer can scan.

Judge severity by what is described, not by how upset the writer sounds. Reports may be written in Hindi, Santhali, Ho, Kurukh, Nagpuri, Khortha or English.`;

export async function classifyProblem(
  title: string,
  description: string,
  district: string,
): Promise<Classification> {
  const { json } = await callGemini(
    chain(process.env.GEMINI_TEXT_MODEL, TEXT_MODELS),
    "generateContent",
    {
      systemInstruction: { parts: [{ text: CLASSIFY_INSTRUCTIONS }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `District: ${district}\nTitle: ${title}\nReport: ${description}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            domain: { type: "STRING", enum: [...DOMAIN_VALUES] },
            confidence: { type: "NUMBER" },
            severity: { type: "INTEGER" },
            affectedEstimate: { type: "INTEGER" },
            summary: { type: "STRING" },
          },
          required: [
            "domain",
            "confidence",
            "severity",
            "affectedEstimate",
            "summary",
          ],
        },
      },
    },
  );

  const body = json as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Classification response was empty.");

  const parsed = JSON.parse(raw) as Classification;
  if (!DOMAIN_VALUES.includes(parsed.domain)) {
    throw new Error(`Model returned an unknown domain: ${parsed.domain}`);
  }

  return {
    domain: parsed.domain,
    confidence: clamp(parsed.confidence, 0, 1),
    severity: Math.round(clamp(parsed.severity, 1, 5)),
    affectedEstimate: Math.max(0, Math.round(parsed.affectedEstimate)),
    summary: parsed.summary,
  };
}

function clamp(value: number, min: number, max: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
