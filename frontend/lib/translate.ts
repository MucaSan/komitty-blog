// Client-side translation of user-generated post content.
//
// UI strings are translated through the i18n messages (see lib/i18n.ts), but
// post titles/bodies are authored by users, so they cannot be in a static
// dictionary. We translate them on demand with the browser-reachable Google
// Translate endpoint (no API key required) and cache results in memory.

import { parseDoc } from "./content";
import type { Language } from "./i18n";

const cache = new Map<string, string>();

function cacheKey(text: string, target: Language): string {
  return `${target}\u0000${text}`;
}

export async function translateText(text: string, target: Language): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const key = cacheKey(trimmed, target);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(trimmed)}`,
    );
    if (!res.ok) throw new Error(`translation failed (${res.status})`);
    const data = await res.json();
    // data[2] is the source language Google auto-detected for the text.
    const detected = typeof data?.[2] === "string" ? data[2] : "";
    const translated = Array.isArray(data?.[0])
      ? data[0]
          .map((segment: unknown) =>
            Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "",
          )
          .join("")
      : "";
    // Always rely on the browser translation, in both directions (EN->PT and
    // PT->EN). When the text is already in the target language we keep the
    // original so we never rewrite content that does not need translating.
    const result = !translated || detected === target ? trimmed : translated;
    cache.set(key, result);
    return result;
  } catch {
    // Never break the page over a failed translation — fall back to the original.
    cache.set(key, trimmed);
    return trimmed;
  }
}

// Translates the text of a post while preserving its rich-text structure.
// TipTap documents are walked and each text node is translated in place; plain
// text content is translated as a single string.
export async function translateContent(content: string, target: Language): Promise<string> {
  const doc = parseDoc(content);
  if (!doc) {
    return translateText(content, target);
  }

  const textNodes: { node: any }[] = [];
  const collect = (node: any) => {
    if (!node) return;
    if (node.type === "text" && typeof node.text === "string" && node.text.trim()) {
      textNodes.push(node);
    }
    if (Array.isArray(node.content)) node.content.forEach(collect);
  };
  collect(doc);

  await Promise.all(
    textNodes.map(async ({ node }) => {
      node.text = await translateText(node.text, target);
    }),
  );

  return JSON.stringify(doc);
}
