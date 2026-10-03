import { getSchema } from "@tiptap/core";
import { DOMSerializer, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { createHTMLDocument } from "zeed-dom";
import { editorExtensions } from "./editorExtensions";

// Posts are stored as TipTap JSON documents. Older / mock content is plain text,
// so we fall back gracefully.

export function contentToHtml(content: string): string {
  const doc = parseDoc(content);
  if (!doc) return plainTextToHtml(content);
  return addHeadingAnchors(docToHtml(doc), extractHeadings(content));
}

// The schema is immutable and expensive to build, so it is reused for every
// post (ProseMirror caches its DOM serializer on the schema as well).
let cachedSchema: ReturnType<typeof getSchema> | null = null;

function htmlSchema(): ReturnType<typeof getSchema> {
  cachedSchema ??= getSchema(editorExtensions);
  return cachedSchema;
}

// Renders a TipTap document with the same schema/extension set the editor uses,
// which keeps inline styles (paragraph alignment, text colour, ...) intact.
//
// `generateHTML()` from @tiptap/html cannot be used for this: it serializes
// through zeed-dom, whose `element.style` is a plain object without a working
// `cssText` setter, while ProseMirror's DOMSerializer writes attributes with
// `dom.style.cssText`. Every inline style was therefore silently dropped in the
// read view, so justified/centred paragraphs fell back to left-aligned and
// coloured text lost its colour. Serializing ourselves and hiding `style` on
// the elements makes ProseMirror fall back to `setAttribute("style", ...)`,
// which zeed-dom does render.
function docToHtml(doc: any): string {
  const schema = htmlSchema();
  const node = ProseMirrorNode.fromJSON(schema, doc);
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(node.content, {
    document: createSerializerDocument(),
  });
  return (fragment as unknown as { render(): string }).render();
}

function createSerializerDocument(): Document {
  const vdocument = createHTMLDocument();
  const createElement = vdocument.createElement.bind(vdocument);
  (vdocument as unknown as { createElement: Document["createElement"] }).createElement = ((
    name: string,
    options?: ElementCreationOptions,
  ) => {
    const element = createElement(name, options);
    Object.defineProperty(element, "style", { value: undefined, configurable: true });
    return element;
  }) as Document["createElement"];
  return vdocument as unknown as Document;
}

// Injects stable `id` attributes into the rendered H2/H3 elements so the table
// of contents can link straight to each section. The slugs come from the same
// helper that builds the TOC (extractHeadings), so they always line up. Baking
// the ids into the HTML means the anchors exist as soon as the post renders,
// instead of relying on a post-render DOM mutation.
export function addHeadingAnchors(html: string, headings: Heading[]): string {
  if (headings.length === 0) return html;

  let index = 0;
  return html.replace(
    /<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag: string, attrs: string, inner: string) => {
      // Keep in sync with extractHeadings(), which skips empty headings.
      const text = inner.replace(/<[^>]*>/g, "").trim();
      if (!text) return match;
      const heading = headings[index++];
      if (!heading || /\bid\s*=/.test(attrs)) return match;
      return `<${tag}${attrs} id="${heading.id}">${inner}</${tag}>`;
    },
  );
}

export function contentToText(content: string): string {
  const doc = parseDoc(content);
  if (doc) return docToText(doc);
  return content;
}

export function parseDoc(content: string): any | null {
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
