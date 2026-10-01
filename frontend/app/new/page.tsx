"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createPost } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

export default function NewPostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    setLoading(true);
    try {
      const post = await createPost(title, content, session);
      router.push(`/u/${post.username}`);
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
          </Link>{" "}
          to create a post.
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="editor">
        <h1 className="editor__title">New post</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="field">
            <input
              className="field__input"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <textarea
              className="field__input field__input--textarea"
              placeholder="Write about your achievement…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="auth__error">{error}</div>
          <button
            className="btn btn--primary"
            type="submit"
            disabled={loading}
            style={{ alignSelf: "flex-start" }}
          >
            {loading ? "Publishing…" : "Publish"}
          </button>
        </form>
      </div>
    </main>
  );
}
