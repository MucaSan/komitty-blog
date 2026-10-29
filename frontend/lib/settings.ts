// Shared settings types, defaults and validation.
//
// The backend stores settings as a single JSONB document and validates the same
// values server-side (see backend/internal/service/service.go). Keeping the
// validation here means the client never sends an unsupported settings object.

import type { Settings, Theme, ToolbarPosition } from "./types";

export const THEMES: Theme[] = ["dark", "white"];
export const TOOLBAR_POSITIONS: ToolbarPosition[] = ["top", "down", "drag"];

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  toolbar: "top",
};

export function isValidSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.theme === "dark" || v.theme === "white") &&
    (v.toolbar === "top" || v.toolbar === "down" || v.toolbar === "drag")
  );
}
