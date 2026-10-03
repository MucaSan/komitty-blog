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
    // Google reports regional variants ("pt-PT", "en-GB"), so compare just the
    // primary subtag — otherwise PT-BR content would get rewritten into PT-PT
    // while the reader is already reading in Portuguese.
    const detectedPrimary = detected.split("-")[0];
    const result = !translated || detectedPrimary === target ? trimmed : translated;
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
//
// TipTap splits a block into one text node per mark boundary, so the spaces
// around a bold/italic/link run live in the neighbouring nodes:
//   "… with the password " + bold("komitty ") + "which was marked …"
// translateText() trims what it returns, so every node's leading/trailing
// whitespace is captured up front and re-attached afterwards. Without that the
// words around each mark end up glued together ("passwordkomittywhich").
export async function translateContent(content: string, target: Language): Promise<string> {
  const doc = parseDoc(content);
  if (!doc) {
    return translateText(content, target);
  }

  const textNodes: { type: string; text: string }[] = [];
  const collect = (node: any) => {
    if (!node) return;
    if (node.type === "text" && typeof node.text === "string" && node.text.trim()) {
      textNodes.push(node);
    }
    if (Array.isArray(node.content)) node.content.forEach(collect);
  };
  collect(doc);

  await Promise.all(
    textNodes.map(async (node) => {
      const original = node.text;
      const leading = /^\s*/.exec(original)?.[0] ?? "";
      const trailing = /\s*$/.exec(original)?.[0] ?? "";
      const core = original.slice(leading.length, original.length - trailing.length);
      // Whitespace-only nodes (and stray empty ones) are left untouched.
      node.text = core ? leading + (await translateText(core, target)) + trailing : original;
    }),
  );

  return JSON.stringify(doc);
}
