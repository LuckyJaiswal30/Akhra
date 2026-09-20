const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'can',
  'do',
  'does',
  'for',
  'from',
  'has',
  'have',
  'he',
  'her',
  'his',
  'how',
  'i',
  'in',
  'is',
  'it',
  'its',
  'me',
  'my',
  'no',
  'not',
  'of',
  'on',
  'or',
  'our',
  'she',
  'so',
  'that',
  'the',
  'their',
  'them',
  'there',
  'they',
  'this',
  'to',
  'up',
  'us',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'will',
  'with',
  'you',
  'your',
  'been',
  'very',
  'more',
  'most',
  'also',
  'get',
  'got',
  'here',
  'because',
  'due',
  'about',
  'into',
  'over',
  'under',
  'than',
  'then',
  'should',
  'would',
  'could',
  'many',
  'much',
  'some',
  'any',
  'all',
  'other',
  'such',
  'only',
  'own',
  'same',
  'है',
  'हैं',
  'का',
  'की',
  'के',
  'को',
  'में',
  'से',
  'पर',
  'और',
  'यह',
  'वह',
  'नहीं',
  'लिए',
  'एक',
  'हो',
  'था',
  'थी',
]);

const TOKEN_PATTERN = /[a-z0-9\p{Script=Devanagari}]+/gu;

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(TOKEN_PATTERN);
  if (!matches) return [];
  return matches.filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function stem(token: string): string {
  if (!/^[a-z]+$/.test(token)) return token;
  for (const suffix of ['ingly', 'edly', 'ing', 'ies', 'ied', 'ers', 'er', 'ed', 'es', 's']) {
    if (token.length > suffix.length + 2 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

export function normalize(text: string): string[] {
  return tokenize(text).map(stem);
}

export type TermFrequency = Map<string, number>;

export function termFrequency(tokens: string[]): TermFrequency {
  const tf: TermFrequency = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

export function buildIdf(documents: string[][]): Map<string, number> {
  const docCount = documents.length;
  const seenIn = new Map<string, number>();
  for (const doc of documents) {
    for (const term of new Set(doc)) {
      seenIn.set(term, (seenIn.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of seenIn) {
    idf.set(term, Math.log((docCount + 1) / (count + 1)) + 1);
  }
  return idf;
}

export function tfIdfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFrequency(tokens);
  const total = tokens.length || 1;
  const vector = new Map<string, number>();
  for (const [term, count] of tf) {
    vector.set(term, (count / total) * (idf.get(term) ?? 1));
  }
  return vector;
}

export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other !== undefined) dot += weight * other;
  }
  for (const weight of a.values()) normA += weight * weight;
  for (const weight of b.values()) normB += weight * weight;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of small) {
    if (large.has(item)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function trigrams(text: string): Set<string> {
  const padded = ` ${text.toLowerCase().replace(/\s+/g, ' ').trim()} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}
