import { generateHTML } from "@tiptap/html";
import { editorExtensions } from "./editorExtensions";

// Posts are stored as TipTap JSON documents. Older / mock content is plain text,
// so we fall back gracefully.

export function contentToHtml(content: string): string {
  const doc = parseDoc(content);
  if (doc) return generateHTML(doc, editorExtensions);
  return plainTextToHtml(content);
}

export function contentToText(content: string): string {
  const doc = parseDoc(content);
  if (doc) return docToText(doc);
  return content;
}

function parseDoc(content: string): any | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return parsed;
    }
  } catch {
    // ignore malformed JSON
  }
  return null;
}

function docToText(node: any): string {
  const parts: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === "text") {
      parts.push(n.text ?? "");
      return;
    }
    if (n.type === "hardBreak") {
      parts.push("\n");
      return;
    }
    if (Array.isArray(n.content)) {
      n.content.forEach(walk);
      if (
        n.type === "paragraph" ||
        n.type === "heading" ||
        n.type === "blockquote" ||
        n.type === "listItem" ||
        n.type === "codeBlock"
      ) {
        parts.push("\n");
      }
    }
  };
  walk(node);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

function plainTextToHtml(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

// Extracts H2/H3 headings (the "sub-topics" of a post) and generates stable
// anchor slugs for a table of contents.
export function extractHeadings(content: string): Heading[] {
  const doc = parseDoc(content);
  if (!doc) return [];

  const headings: Heading[] = [];
  const counts: Record<string, number> = {};

  const textOf = (node: any): string => {
    let s = "";
    const walk = (n: any) => {
      if (!n) return;
      if (n.type === "text") s += n.text ?? "";
      if (Array.isArray(n.content)) n.content.forEach(walk);
    };
    walk(node);
    return s.trim();
  };

  const slug = (text: string): string => {
    const base =
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";
    const n = (counts[base] = (counts[base] ?? 0) + 1);
    return n === 1 ? base : `${base}-${n}`;
  };

  const walk = (node: any) => {
    if (!node) return;
    if (
      node.type === "heading" &&
      node.attrs?.level >= 2 &&
      node.attrs?.level <= 3
    ) {
      const text = textOf(node);
      if (text) headings.push({ id: slug(text), text, level: node.attrs.level });
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc);

  return headings;
}
