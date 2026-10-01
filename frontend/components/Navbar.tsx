"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { clearSession, getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

export function Navbar() {
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link href="/" className="navbar__brand">
          <Logo size={30} />
          <span>Komitty</span>
        </Link>
        <nav className="navbar__links">
          <Link href="/" className="navbar__link">
            Feed
          </Link>
          {mounted && session ? (
            <>
              <Link href="/new" className="navbar__link">
                New post
              </Link>
              <Link href={`/u/${session.user.username}`} className="navbar__link">
                @{session.user.username}
              </Link>
              <button className="btn btn--pill-blue" style={{ padding: "6px 16px" }} onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="navbar__link">
                Login
              </Link>
              <Link href="/signup" className="btn btn--pill-blue" style={{ padding: "6px 16px" }}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
