"use client";

import { Extension } from "@tiptap/core";
import { useEffect, useState } from "react";

/**
 * Keyboard shortcuts advertised by the RichTextEditor toolbar tooltips.
 *
 * Two groups:
 *  - `EXTENSION_SHORTCUTS` are already registered by the installed TipTap
 *    extensions (StarterKit, Underline, Highlight, TextAlign). They are only
 *    advertised; binding them again would shadow the originals.
 *  - `APP_SHORTCUTS` are registered by the `EditorShortcuts` extension below,
 *    for the toolbar buttons that had no shortcut of their own.
 *
 * Values use TipTap/ProseMirror key names: `Mod` is Cmd on macOS and Ctrl
 * elsewhere, and modifiers are separated with `-`.
 */
const EXTENSION_SHORTCUTS = {
  heading1: "Mod-Alt-1",
  heading2: "Mod-Alt-2",
  heading3: "Mod-Alt-3",
  alignLeft: "Mod-Shift-l",
  alignCenter: "Mod-Shift-e",
  alignRight: "Mod-Shift-r",
  alignJustify: "Mod-Shift-j",
  bold: "Mod-b",
  italic: "Mod-i",
  underline: "Mod-u",
  strike: "Mod-Shift-s",
  inlineCode: "Mod-e",
  highlight: "Mod-Shift-h",
  bulletList: "Mod-Shift-8",
  orderedList: "Mod-Shift-7",
  quote: "Mod-Shift-b",
  codeBlock: "Mod-Alt-c",
} as const;

const APP_SHORTCUTS = {
  link: "Mod-k",
  textColor: "Mod-Alt-p",
  divider: "Mod-Alt-d",
  table: "Mod-Alt-t",
  image: "Mod-Alt-f",
  addRowAfter: "Mod-Alt-Shift-r",
  addColumnAfter: "Mod-Alt-Shift-a",
  deleteRow: "Mod-Alt-Shift-d",
  deleteColumn: "Mod-Alt-Shift-c",
  deleteTable: "Mod-Alt-Shift-x",
} as const;

/** Every toolbar action that has a shortcut, mapped to its key binding. */
export const EDITOR_SHORTCUTS = { ...EXTENSION_SHORTCUTS, ...APP_SHORTCUTS };

export type EditorShortcutId = keyof typeof EDITOR_SHORTCUTS;
export type AppShortcutId = keyof typeof APP_SHORTCUTS;

/**
 * Toolbar actions handled by the app. Each handler returns `true` when the key
 * event was consumed, so the browser default is suppressed (e.g. Ctrl+K must
 * not focus the address bar) and `false` when the action does not apply.
 */
export type EditorShortcutHandlers = Record<AppShortcutId, () => boolean>;

const APP_SHORTCUT_IDS = Object.keys(APP_SHORTCUTS) as AppShortcutId[];

/**
 * ProseMirror matches a binding such as `Shift-r` against `event.key`, which is
 * upper-cased while Shift is held, and Windows never falls back to the
 * unshifted key code once Ctrl and Alt are both down. Registering both cases
 * keeps `Mod-Alt-Shift-*` working on every platform; the lowercase form stays
 * the canonical one that the tooltip advertises.
 */
function withUpperCaseAlias(binding: string): string[] {
  const parts = binding.split("-");
  const key = parts[parts.length - 1];
  if (key.length !== 1 || key < "a" || key > "z") return [binding];
  parts[parts.length - 1] = key.toUpperCase();
  return [binding, parts.join("-")];
}

/**
 * Binds the `APP_SHORTCUTS` keys. The handlers are read lazily on every key
 * event through `getHandlers`, so the extension can be created once (when the
 * editor mounts) while still calling the latest React callbacks.
 */
export const EditorShortcuts = Extension.create<{
  getHandlers: () => EditorShortcutHandlers | null;
}>({
  name: "editorShortcuts",

  addOptions() {
    return { getHandlers: () => null };
  },

  addKeyboardShortcuts() {
    const bindings: Record<string, () => boolean> = {};
    for (const id of APP_SHORTCUT_IDS) {
      const run = () => this.options.getHandlers()?.[id]?.() ?? false;
      for (const binding of withUpperCaseAlias(APP_SHORTCUTS[id])) {
        bindings[binding] = run;
      }
    }
    return bindings;
  },
});

const MAC_SYMBOLS: Record<string, string> = {
  Mod: "⌘",
  Ctrl: "⌃",
  Alt: "⌥",
  Shift: "⇧",
};

const PC_NAMES: Record<string, string> = {
  Mod: "Ctrl",
  Ctrl: "Ctrl",
  Alt: "Alt",
  Shift: "Shift",
};

const KEY_LABELS: Record<string, string> = {
  Enter: "↵",
  Backspace: "⌫",
  Delete: "⌦",
  Tab: "⇥",
  " ": "Space",
};

function splitBinding(binding: string): { modifiers: string[]; key: string } {
  const parts = binding.split("-");
  const key = parts.pop() ?? "";
  return { modifiers: parts, key };
}

function keyLabel(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  return key.length === 1 ? key.toUpperCase() : key;
}

/** `"Mod-Alt-1"` → `"⌘⌥1"` on macOS, `"Ctrl+Alt+1"` everywhere else. */
export function formatShortcut(binding: string, isMac: boolean): string {
  const { modifiers, key } = splitBinding(binding);
  const names = isMac ? MAC_SYMBOLS : PC_NAMES;
  const keys = [...modifiers.map((modifier) => names[modifier] ?? modifier), keyLabel(key)];
  return keys.join(isMac ? "" : "+");
}

/** `"Mod-Shift-s"` → `"Meta+Shift+S"` on macOS, `"Control+Shift+S"` elsewhere. */
export function toAriaKeyshortcuts(binding: string, isMac: boolean): string {
  const { modifiers, key } = splitBinding(binding);
  const keys = modifiers.map((modifier) => {
    if (modifier !== "Mod") return modifier;
    return isMac ? "Meta" : "Control";
  });
  return [...keys, keyLabel(key)].join("+");
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const { platform, userAgent } = navigator;
  return /mac|iphone|ipad|ipod/i.test(platform || userAgent);
}

/**
 * Resolves the platform after mount: the first render always reports the
 * non-macOS labels, so server and client markup match during hydration.
 */
export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(isMacPlatform());
  }, []);

  return isMac;
}
