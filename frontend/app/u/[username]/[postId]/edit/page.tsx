"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useTranslation } from "@/components/LanguageProvider";
import { getPost, updatePost, uploadImage } from "@/lib/api";
import { clearDraft, loadDraft, useDraftAutosave } from "@/lib/draft";
import { fileToBase64 } from "@/lib/file";
import { getSession } from "@/lib/session";
import type { Post, Session } from "@/lib/types";

export default function EditPostPage() {
  const { t } = useTranslation();
  const params = useParams<{ postId: string }>();
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
    getPost(postId)
      .then((p) => {
        setPost(p);
        if (p) {
          // Prefer an autosaved draft, which holds the latest unsaved changes.
          const draft = loadDraft(`edit:${postId}`);
          if (draft) {
            setTitle(draft.title);
            setContent(draft.content);
          } else {
            setTitle(p.title);
            setContent(p.content);
          }
          setIsEmpty(false);
        }
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [postId]);

  // Autosave in-progress changes every 60 seconds.
  useDraftAutosave(!!session && !!post, `edit:${postId}`, () => ({ title, content }));

  async function handleUploadImage(file: File): Promise<string> {
    if (!session) throw new Error(t("errors.needLoginImages"));
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
      clearDraft(`edit:${postId}`);
      router.push(`/u/${encodeURIComponent(post.username)}/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <p className="empty">{t("post.loading")}</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="container">
        <p className="empty">{t("post.notFound")}</p>
      </main>
    );
  }

  if (mounted && !session) {
    return (
      <main className="container">
        <p className="empty">
          <Link href="/login" style={{ color: "var(--primary)" }}>
            {t("editPost.needLogin")}
          </Link>
        </p>
      </main>
    );
  }

  if (mounted && session && session.user.id !== post.userId) {
    return (
      <main className="container">
        <p className="empty">{t("editPost.notOwner")}</p>
      </main>
    );
  }

  const canSave = title.trim().length > 0 && !isEmpty;

  return (
    <main className="container">
      <div className="editor">
        <h1 className="editor__title">{t("editPost.title")}</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            className="editor__title-input"
            placeholder={t("newPost.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <RichTextEditor
            initialContent={content}
            placeholder={t("newPost.contentPlaceholder")}
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
              {saving ? t("editPost.saving") : t("editPost.save")}
            </button>
            <Link
              href={`/u/${encodeURIComponent(post.username)}/${post.id}`}
              className="btn btn--danger"
              style={{ padding: "6px 16px" }}
            >
              {t("editPost.cancel")}
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
