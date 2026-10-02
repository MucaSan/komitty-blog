// Draft autosave for the post create/edit forms.
//
// The editor can close abruptly (tab closed, accidental navigation, a crash),
// so we persist the in-progress title + content to localStorage every 60
// seconds (and on page unload) and restore it the next time the form opens.

import { useEffect, useRef } from "react";

export interface Draft {
  title: string;
  content: string;
  savedAt: string;
}

const PREFIX = "komitty_draft";

function storageKey(key: string): string {
  return `${PREFIX}:${key}`;
}

export function loadDraft(key: string): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (parsed && typeof parsed.title === "string" && typeof parsed.content === "string") {
      return parsed;
    }
  } catch {
    // ignore corrupted drafts
  }
  return null;
}

export function saveDraft(key: string, draft: Omit<Draft, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const value: Draft = { ...draft, savedAt: new Date().toISOString() };
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // storage may be unavailable (private browsing / quota exceeded)
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}

// Saves the current draft every 60 seconds (and on page unload). `getDraft` is
// kept in a ref so the interval always reads the latest title/content values.
export function useDraftAutosave(
  enabled: boolean,
  key: string,
  getDraft: () => { title: string; content: string } | null,
): void {
  const getDraftRef = useRef(getDraft);
  getDraftRef.current = getDraft;

  useEffect(() => {
    if (!enabled) return;

    const save = () => {
      const draft = getDraftRef.current();
      if (!draft) return;
      if (!draft.title.trim() && !draft.content.trim()) return;
      saveDraft(key, draft);
    };

    const intervalId = window.setInterval(save, 60_000);
    window.addEventListener("beforeunload", save);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("beforeunload", save);
    };
  }, [enabled, key]);
}
