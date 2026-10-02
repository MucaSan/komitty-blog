"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { listUserPosts, updatePost, uploadImage } from "@/lib/api";
import { fileToBase64 } from "@/lib/file";
import { getSession } from "@/lib/session";
import type { Post, Session } from "@/lib/types";

export default function EditPostPage() {
  const params = useParams<{ username: string; postId: string }>();
  const username = params?.username ?? "";
  const postId = params?.postId ?? "";

  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isEmpty, setIsEmpty] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    listUserPosts(username)
      .then((posts) => {
        const p = posts.find((x) => x.id === postId) ?? null;
        setPost(p);
        if (p) {
          setTitle(p.title);
          setContent(p.content);
          setIsEmpty(false);
        }
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [username, postId]);

  async function handleUploadImage(file: File): Promise<string> {
    if (!session) throw new Error("You need to be logged in to upload images");
    const base64 = await fileToBase64(file);
    const { url } = await uploadImage(base64, file.type, session);
    return url;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session || !post) return;
    setError("");
    setSaving(true);
    try {
      await updatePost(post.id, title, content, session);
      router.push(`/u/${post.username}/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <p className="empty">Loading…</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="container">
        <p className="empty">Post not found.</p>
      </main>
    );
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

  if (mounted && session && session.user.id !== post.userId) {
    return (
      <main className="container">
        <p className="empty">You can only edit your own posts.</p>
      </main>
    );
  }

  const canSave = title.trim().length > 0 && !isEmpty;

  return (
    <main className="container">
      <div className="editor">
        <h1 className="editor__title">Edit post</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            className="editor__title-input"
            placeholder="Post title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <RichTextEditor
            initialContent={post.content}
            onChange={(json, empty) => {
              setContent(json);
              setIsEmpty(empty);
            }}
            onUploadImage={handleUploadImage}
          />
          <div className="auth__error">{error}</div>
          <div className="post__actions" style={{ marginTop: 0 }}>
            <button
              className="btn btn--primary"
              type="submit"
              disabled={saving || !canSave}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <Link href={`/u/${post.username}/${post.id}`} className="btn btn--pill">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
