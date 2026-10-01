"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { createUser } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

export default function NewUserPage() {
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
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await createUser(username, password, session);
      setSuccess(`Account "@${username}" created.`);
      setUsername("");
      setPassword("");
      setRepeat("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (mounted && !session) {
    return (
      <main className="container">
        <p className="empty">
          You need to{" "}
          <Link href="/login" style={{ color: "var(--primary)" }}>
            log in
          </Link>
          .
        </p>
      </main>
    );
  }

  if (mounted && session && !session.user.isPrime) {
    return (
      <main className="container">
        <p className="empty">Only the prime user can create accounts.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="editor">
        <h1 className="editor__title">New user</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="field">
            <input
              className="field__input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
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
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}