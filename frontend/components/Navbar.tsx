"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { clearSession, getSession, onSessionChange } from "@/lib/session";
import { useLanguage, useTranslation } from "@/components/LanguageProvider";
import type { Session } from "@/lib/types";

export function Navbar() {
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const update = () => setSession(getSession());
    update();
    setMounted(true);
    return onSessionChange(update);
  }, []);

  function handleLogout() {
    clearSession();
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link href="/" className="navbar__brand">
          <Logo size={30} />
          <span>komitty</span>
        </Link>
        <nav className="navbar__links">
          <Link href="/" className="navbar__link">
            {t("nav.feed")}
          </Link>
          {mounted && session ? (
            <>
              {session.user.isPrime && (
                <Link href="/new-user" className="navbar__link">
                  {t("nav.newUser")}
                </Link>
              )}
              <Link href="/new" className="navbar__link">
                {t("nav.newPost")}
              </Link>
              <Link href={`/u/${encodeURIComponent(session.user.username)}`} className="navbar__link">
                @{session.user.username}
              </Link>
              <button className="btn btn--danger" style={{ padding: "6px 16px" }} onClick={handleLogout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link href="/login" className="navbar__link">
              {t("nav.login")}
            </Link>
          )}

          <div className="lang-switcher" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === "en" ? "lang-switcher__active" : ""}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <span className="lang-switcher__sep">|</span>
            <button
              type="button"
              className={lang === "pt" ? "lang-switcher__active" : ""}
              onClick={() => setLang("pt")}
            >
              PT
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
