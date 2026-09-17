export const CIVIL_COPY = "Keep it civil — profanity and hate speech are not allowed.";

const BLOCKED_WORDS = [
  "fuck","fucker","fucking","motherfucker","fck","fuk","fcuk","fvck","shit","sht","shyt","bullshit","shitty",
  "asshole","arsehole","bastard","bitch","bitches","btch","cock","cocksucker","cunt","dick","dickhead","pussy",
  "slut","whore","wanker","twat","faggot","fag","dyke","tranny","shemale","retard","retarded","spastic","spaz",
  "nigger","nigga","kike","spic","chink","gook","wetback","beaner","paki","rape","rapist","molest","pedophile",
  "paedophile","nazi","hitler",
] as const;

const BLOCKED_PHRASES = ["kill yourself","kill you","gas the","hang yourself","go die","white power","heil hitler"] as const;

const SUBSTITUTIONS: Record<string, string> = { "@": "a", $": "s", "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "!": "i" };

function normalize(text: string, atAs: "a" | "u" = "a"): string {
  let out = text.toLowerCase().replace(/[\u200b-\u200f\ufeff]/g, "");
  out = out.replace(/[@$013457!]/g, (ch) => (ch === "@" ? atAs : SUBSTITUTIONS[ch] ?? ch));
  out = out.replace(/[*._]/g, "").replace(/[^a-z]+/g, " ");
  return out.replace(/\s+/g, " ").trim();
}

function tokensFrom(normalized: string): string[] {
  const raw = normalized.split(" ").filter(Boolean);
  const merged: string[] = [];
  let run = "";
  for (const token of raw) {
    if (token.length === 1) { run += token; continue; }
    if (run) { merged.push(run); run = ""; }
    merged.push(token);
  }
  if (run) merged.push(run);
  return merged;
}

function civilNormalized(normalized: string): boolean {
  if (!normalized) return true;
  for (const phrase of BLOCKED_PHRASES) if (normalized.includes(phrase)) return false;
  const tokens = new Set(tokensFrom(normalized));
  for (const word of BLOCKED_WORDS) if (tokens.has(word)) return false;
  return true;
}

export function isCivil(text: string): boolean {
  if (!text.trim()) return true;
  return civilNormalized(normalize(text, "a")) && civilNormalized(normalize(text, "u"));
}

export function assertCivil(text: string): void {
  if (!isCivil(text)) throw new Error(CIVIL_COPY);
}
