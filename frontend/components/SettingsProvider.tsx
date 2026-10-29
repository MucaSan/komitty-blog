"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSettings as fetchSettings, updateSettings as saveSettings } from "@/lib/api";
import { getSession, onSessionChange } from "@/lib/session";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Settings, Session } from "@/lib/types";

type Ctx = {
  settings: Settings;
  loading: boolean;
  saving: boolean;
  error: string;
  refresh: () => void;
  updateSettings: (next: Settings) => Promise<void>;
};

const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  saving: false,
  error: "",
  refresh: () => {},
  updateSettings: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const update = () => setSession(getSession());
    update();
    return onSessionChange(update);
  }, []);

  // Apply the theme to the document root whenever it changes.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const refresh = useCallback(() => {
    const current = getSession();
    if (!current) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetchSettings(current)
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [session, refresh]);

  const updateSettings = useCallback(async (next: Settings) => {
    const current = getSession();
    if (!current) throw new Error("You need to log in to change settings.");
    setSaving(true);
    setError("");
    try {
      const saved = await saveSettings(next, current);
      setSettings(saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, saving, error, refresh, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
