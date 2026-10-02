"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { useTranslation } from "@/components/LanguageProvider";
import { createUser } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

export default function NewUserPage() {
  const { t } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    setSuccess("");

    if (password !== repeat) {
      setError(t("errors.passwordsMismatch"));
      return;
    }

    setLoading(true);
    try {
      await createUser(username, password, session);
      setSuccess(t("newUser.created", { username }));
      setUsername("");
      setPassword("");
      setRepeat("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  if (mounted && !session) {
    return (
      <main className="container">
        <p className="empty">
          <Link href="/login" style={{ color: "var(--primary)" }}>
            {t("newUser.needLogin")}
          </Link>
        </p>
      </main>
    );
  }

  if (mounted && session && !session.user.isPrime) {
    return (
      <main className="container">
        <p className="empty">{t("newUser.onlyPrime")}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="editor">
        <h1 className="editor__title">{t("newUser.title")}</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="field">
            <input
              className="field__input"
              placeholder={t("newUser.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </div>
          <PasswordField
            placeholder={t("newUser.password")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordField
            placeholder={t("newUser.repeatPassword")}
            value={repeat}
            onChange={setRepeat}
            autoComplete="new-password"
          />
          {success ? (
            <div className="auth__success">{success}</div>
          ) : (
            <div className="auth__error">{error}</div>
          )}
          <button
            className="btn btn--primary"
            type="submit"
            disabled={loading}
            style={{ alignSelf: "flex-start" }}
          >
            {loading ? t("newUser.creating") : t("newUser.createAccount")}
          </button>
        </form>
      </div>
    </main>
  );
}