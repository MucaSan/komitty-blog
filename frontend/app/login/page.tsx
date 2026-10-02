"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";
import { PasswordField } from "@/components/PasswordField";
import { useTranslation } from "@/components/LanguageProvider";
import { login } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await login(username, password);
      setSession(session);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <Logo size={69} />
      <h1 className="auth__title">{t("login.title")}</h1>

      <form className="auth__form" onSubmit={handleSubmit}>
        <div className="field">
          <input
            className="field__input"
            placeholder={t("login.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <PasswordField
          placeholder={t("login.password")}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <div className="auth__error">{error}</div>
        <button
          className="btn btn--primary btn--block"
          style={{ maxWidth: 311 }}
          type="submit"
          disabled={loading}
        >
          {loading ? t("login.loggingIn") : t("login.continue")}
        </button>
      </form>
    </main>
  );
}
