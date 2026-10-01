"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { createPost } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

export default function NewPostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
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
      router.push(`/u/${post.username}/${post.id}`);
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

  const canPublish = title.trim().length > 0 && !isEmpty;

  return (
    <main className="container">
      <div className="editor">
        <h1 className="editor__title">New post</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            className="editor__title-input"
            placeholder="Post title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
          <RichTextEditor
            onChange={(json, empty) => {
              setContent(json);
              setIsEmpty(empty);
            }}
          />
          <div className="auth__error">{error}</div>
          <button
            className="btn btn--primary"
            type="submit"
            disabled={loading || !canPublish}
            style={{ alignSelf: "flex-start" }}
          >
            {loading ? "Publishing…" : "Publish"}
          </button>
        </form>
      </div>
    </main>
  );
}
