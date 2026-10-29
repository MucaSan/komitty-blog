"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { useSettings } from "@/components/SettingsProvider";
import { THEMES, TOOLBAR_POSITIONS } from "@/lib/settings";
import type { Settings, Theme, ToolbarPosition } from "@/lib/types";

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function SettingsDialog() {
  const { t } = useTranslation();
  const { settings, saving, error, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Settings>(settings);

  // Re-seed the draft from the latest server settings whenever it opens.
  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSave() {
    try {
      await updateSettings(draft);
      setOpen(false);
    } catch {
      // Error is surfaced through the settings context.
    }
  }

  const themeLabel: Record<Theme, string> = {
    dark: t("settings.themeDark"),
    white: t("settings.themeWhite"),
  };
  const toolbarLabel: Record<ToolbarPosition, string> = {
    top: t("settings.toolbarTop"),
    down: t("settings.toolbarDown"),
    drag: t("settings.toolbarDrag"),
  };

  return (
    <>
      <button
        type="button"
        className="navbar__settings-btn"
        aria-label={t("settings.open")}
        title={t("settings.open")}
        onClick={() => setOpen(true)}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="settings-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            className="settings"
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.title")}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="settings__header">
              <h2 className="settings__title">{t("settings.title")}</h2>
              <button
                type="button"
                className="settings__close"
                aria-label={t("settings.cancel")}
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <fieldset className="settings__group">
              <legend className="settings__label">{t("settings.theme")}</legend>
              <div className="settings__options">
                {THEMES.map((theme) => (
                  <label key={theme} className="settings__option">
                    <input
                      type="radio"
                      name="settings-theme"
                      value={theme}
                      checked={draft.theme === theme}
                      onChange={() => setDraft((d) => ({ ...d, theme }))}
                    />
                    <span>{themeLabel[theme]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="settings__group">
              <legend className="settings__label">{t("settings.toolbar")}</legend>
              <div className="settings__options">
                {TOOLBAR_POSITIONS.map((toolbar) => (
                  <label key={toolbar} className="settings__option">
                    <input
                      type="radio"
                      name="settings-toolbar"
                      value={toolbar}
                      checked={draft.toolbar === toolbar}
                      onChange={() => setDraft((d) => ({ ...d, toolbar }))}
                    />
                    <span>{toolbarLabel[toolbar]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <div className="settings__error">{error}</div>}

            <div className="settings__actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                {t("settings.cancel")}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t("settings.saving") : t("settings.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
