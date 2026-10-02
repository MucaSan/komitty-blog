"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useTranslation } from "@/components/LanguageProvider";
import { createPost, uploadImage } from "@/lib/api";
import { clearDraft, loadDraft, useDraftAutosave } from "@/lib/draft";
import { contentToText } from "@/lib/content";
import { fileToBase64 } from "@/lib/file";
import { getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

export default function NewPostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  // Restore any previously autosaved draft.
  useEffect(() => {
    const draft = loadDraft("new");
    if (draft) {
      setTitle(draft.title);
      setContent(draft.content);
      setInitialContent(draft.content);
      setIsEmpty(contentToText(draft.content).trim().length === 0);
    }
    setDraftReady(true);
  }, []);

  // Autosave in-progress changes every 60 seconds.
  useDraftAutosave(!!session, "new", () => ({ title, content }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError("");
    setLoading(true);
    try {
      const post = await createPost(title, content, session);
      clearDraft("new");
      router.push(`/u/${post.username}/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadImage(file: File): Promise<string> {
    if (!session) throw new Error(t("errors.needLoginImages"));
    const base64 = await fileToBase64(file);
    const { url } = await uploadImage(base64, file.type, session);
    return url;
  }

  if (mounted && !session) {
    return (
      <main className="container">
        <p className="empty">
          <Link href="/login" style={{ color: "var(--primary)" }}>
            {t("newPost.needLogin")}
          </Link>
        </p>
      </main>
    );
  }

  const canPublish = title.trim().length > 0 && !isEmpty;

  return (
    <main className="container">
      <div className="editor">
        <h1 className="editor__title">{t("newPost.title")}</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            className="editor__title-input"
            placeholder={t("newPost.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
          />
          <RichTextEditor
            key={draftReady ? "ready" : "pending"}
            initialContent={initialContent}
            placeholder={t("newPost.contentPlaceholder")}
            onChange={(json, empty) => {
              setContent(json);
              setIsEmpty(empty);
            }}
            onUploadImage={handleUploadImage}
          />
          <div className="auth__error">{error}</div>
          <button
            className="btn btn--primary"
            type="submit"
            disabled={loading || !canPublish}
            style={{ alignSelf: "flex-start" }}
          >
            {loading ? t("newPost.publishing") : t("newPost.publish")}
          </button>
        </form>
      </div>
    </main>
  );
}
