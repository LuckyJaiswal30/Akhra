import { Classification, DomainValue } from "./gemini";

const KEYWORDS: Record<DomainValue, string[]> = {
  water: ["water", "handpump", "hand pump", "borewell", "well", "tap", "pond", "river", "drinking", "tubewell", "pani", "jal", "supply", "tanker", "drain"],
  healthcare: ["hospital", "health", "clinic", "doctor", "medicine", "ambulance", "sick", "illness", "disease", "malaria", "dengue", "anganwadi", "nurse", "vaccination", "malnutrition"],
  education: ["school", "teacher", "student", "class", "classroom", "education", "midday", "mid day", "college", "exam", "dropout", "library", "study"],
  agriculture: ["crop", "farm", "farmer", "seed", "irrigation", "harvest", "paddy", "soil", "fertiliser", "fertilizer", "pest", "khet", "kisan", "cattle", "livestock"],
  environment: ["pollution", "forest", "tree", "waste", "garbage", "dumping", "smoke", "air", "wildlife", "erosion", "mining", "quarry", "effluent"],
  energy: ["electricity", "power", "transformer", "solar", "light", "bijli", "outage", "voltage", "streetlight", "grid", "connection"],
  urban: ["road", "pothole", "street", "bridge", "drainage", "sewer", "footpath", "traffic", "housing", "building", "market", "toilet", "sanitation"],
  accessibility: ["disabled", "disability", "wheelchair", "ramp", "blind", "deaf", "elderly", "access", "mobility"],
  governance: ["certificate", "ration", "pension", "office", "official", "corruption", "bribe", "scheme", "application", "aadhaar", "record", "panchayat", "documents"],
  livelihoods: ["job", "employment", "wage", "mgnrega", "work", "income", "loan", "shg", "self help", "artisan", "migration", "market access", "training"],
};

const SEVERITY_SIGNALS: { words: string[]; level: number }[] = [
  { words: ["death", "died", "dying", "collapse", "emergency", "fire", "drowned", "epidemic"], level: 5 },
  { words: ["sick", "unwell", "ill", "injury", "injured", "unsafe", "danger", "contaminated", "poison", "disease"], level: 4 },
  { words: ["broken", "damaged", "leaking", "shortage", "no supply", "closed", "shut", "failed"], level: 3 },
];

export function classifyByRules(
  title: string,
  description: string,
): Classification {
  const text = `${title} ${description}`.toLowerCase();

  let best: DomainValue = "governance";
  let bestHits = 0;

  for (const [domain, words] of Object.entries(KEYWORDS) as [DomainValue, string[]][]) {
    const hits = words.filter((word) => text.includes(word)).length;
    if (hits > bestHits) {
      best = domain;
      bestHits = hits;
    }
  }

  let severity = 2;
  for (const signal of SEVERITY_SIGNALS) {
    if (signal.words.some((word) => text.includes(word))) {
      severity = Math.max(severity, signal.level);
    }
  }

  const stated = description.match(/\b(\d{2,6})\s*(people|persons|families|households|villagers)\b/i);
  const affectedEstimate = stated ? Number(stated[1]) : 200;

  return {
    domain: best,
    confidence: bestHits === 0 ? 0.2 : Math.min(0.6, 0.25 + bestHits * 0.1),
    severity,
    affectedEstimate,
    summary: title,
  };
}
