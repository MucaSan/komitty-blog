"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { messages, type Language } from "@/lib/i18n";

type Ctx = { lang: Language; setLang: (l: Language) => void };

const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {} });

const STORAGE_KEY = "komitty_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "pt") setLangState(saved);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

function lookup(obj: unknown, path: string): string | undefined {
  let cur: any = obj;
  for (const part of path.split(".")) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { lang } = useContext(LanguageContext);

  const t = (key: string, vars?: Record<string, string>) => {
    let str = lookup(messages[lang], key) ?? lookup(messages.en, key) ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, v);
      }
    }
    return str;
  };

  return { t, lang };
}
