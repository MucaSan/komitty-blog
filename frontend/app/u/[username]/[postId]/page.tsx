"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TableOfContents } from "@/components/TableOfContents";
import { useTranslation } from "@/components/LanguageProvider";
import { deletePost, getPost } from "@/lib/api";
import { contentToHtml, contentToText, extractHeadings } from "@/lib/content";
import { getSession } from "@/lib/session";
import { translateContent, translateText } from "@/lib/translate";
import type { Post, Session } from "@/lib/types";

export default function PostPage() {
  const { t, lang } = useTranslation();
  const params = useParams<{ postId: string }>();
  const postId = params?.postId ?? "";

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Translation of the title/body for the currently selected language. Keyed by
  // post id so a stale translation is never shown while a new post (or a new
  // language) is being fetched.
  const [translation, setTranslation] = useState<{
    postId: string;
    title: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  async function handleDelete() {
    if (!session || !post) return;
    if (!window.confirm(t("post.deleteConfirm"))) return;
    setDeleting(true);
    try {
      await deletePost(post.id, session);
      router.push("/");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t("post.deleteFailed"));
      setDeleting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setPost(null);
    getPost(postId)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [postId]);

  // Always translate the post to the selected language: choosing EN turns a
  // Portuguese post into English and choosing PT does the reverse. Text that is
  // already in the target language is returned unchanged by translateText().
  // Editing a post is unaffected: the editor keeps the language it was written
  // in (see the edit page, which never translates the stored content).
  useEffect(() => {
    if (!post) {
      setTranslation(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const [nextTitle, nextContent] = await Promise.all([
        translateText(post.title, lang),
        translateContent(post.content, lang),
      ]);
      if (!cancelled) {
        setTranslation({ postId: post.id, title: nextTitle, content: nextContent });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post, lang]);

  const activeTranslation = translation?.postId === post?.id ? translation : null;
  const title = activeTranslation?.title ?? post?.title ?? "";
  const content = activeTranslation?.content ?? post?.content ?? "";

  const headings = useMemo(
    () => (post ? extractHeadings(content) : []),
    [post, content],
  );

  const readingMinutes = useMemo(() => {
    if (!post) return 1;
    const words = contentToText(content)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [post, content]);

  // Track which heading is currently in view for the table of contents. The
  // anchor ids are baked into the rendered HTML by contentToHtml(), so there is
  // no post-render DOM mutation to rely on here.
  useEffect(() => {
    if (headings.length === 0) return;

    const onScroll = () => {
      const current = headings
        .slice()
        .reverse()
        .find((h) => {
          const el = document.getElementById(h.id);
          if (!el) return false;
          return el.getBoundingClientRect().top <= 120;
        });
      setActiveId(current?.id ?? headings[0]?.id ?? null);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

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

  const date = new Date(post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="container container--post">
      <article className="post">
        <header className="post__header">
          <h1 className="post__title">{title}</h1>
          <div className="post__meta">
            <Link href={`/u/${encodeURIComponent(post.username)}`} className="post-entry__author">
              @{post.username}
            </Link>
            <span>·</span>
            <time>{date}</time>
            <span>·</span>
            <span>
              {readingMinutes} {t("post.minRead")}
            </span>
          </div>
          {mounted && session && session.user.id === post.userId && (
            <div className="post__actions">
              <Link href={`/u/${encodeURIComponent(post.username)}/${post.id}/edit`} className="btn btn--pill btn--pill-blue">
                {t("post.edit")}
              </Link>
              <button
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t("post.deleting") : t("post.delete")}
              </button>
            </div>
          )}
        </header>

        <div className="post__body">
          <div
            className="post__content"
            dangerouslySetInnerHTML={{ __html: contentToHtml(content) }}
          />
          <TableOfContents headings={headings} activeId={activeId} />
        </div>
      </article>
    </main>
  );
}