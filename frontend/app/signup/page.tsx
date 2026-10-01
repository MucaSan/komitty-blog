"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";
import { PasswordField } from "@/components/PasswordField";
import { createUser } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const session = await createUser(username, password);
      setSession(session);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <Logo size={69} />

      <div className="auth__indicators">
        <span className="indicator indicator--active" />
        <span className="indicator" />
        <span className="indicator" />
      </div>

      <h1 className="auth__title--gradient">Create your account</h1>
      <p className="auth__subtitle">Your achievements are safe with Komitty</p>

      <form className="auth__form" onSubmit={handleSubmit}>
        <div className="field">
          <input
            className="field__input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <PasswordField
          placeholder="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordField
          placeholder="Repeat password"
          value={repeatPassword}
          onChange={setRepeatPassword}
          autoComplete="new-password"
        />
        <div className="auth__error">{error}</div>
        <button
          className="btn btn--primary btn--block"
          style={{ maxWidth: 311 }}
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Continue"}
        </button>
      </form>

      <div className="or-row">
        <span className="or-row__line" />
        <span className="or-row__label">OR</span>
        <span className="or-row__line" />
      </div>

      <div className="auth__footer">
        <span>Already have an account?</span>
        <Link href="/login" className="btn btn--pill-blue">
          Login
        </Link>
      </div>
    </main>
  );
}
