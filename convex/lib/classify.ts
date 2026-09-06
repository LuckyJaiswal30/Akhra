import { Classification, classifyProblem as withGemini } from "./gemini";
import { classifyWithGroq, groqAvailable } from "./groq";
import { classifyByRules } from "./rules";

export type ClassificationResult = Classification & { source: string };

export async function classify(
  title: string,
  description: string,
  district: string,
): Promise<ClassificationResult> {
  const failures: string[] = [];

  try {
    return { ...(await withGemini(title, description, district)), source: "gemini" };
  } catch (cause) {
    failures.push(cause instanceof Error ? cause.message : String(cause));
  }

  if (groqAvailable()) {
    try {
      return { ...(await classifyWithGroq(title, description, district)), source: "groq" };
    } catch (cause) {
      failures.push(cause instanceof Error ? cause.message : String(cause));
    }
  }

  console.warn("falling back to keyword rules", failures.join(" | "));
  return { ...classifyByRules(title, description), source: "rules" };
}
