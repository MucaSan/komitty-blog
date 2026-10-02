"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Portuguese translations of the title/body (only populated when lang === "pt").
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);

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

  // Translate the post content on demand when the user is reading in Portuguese.
  useEffect(() => {
    if (!post || lang !== "pt") {
      setTranslatedTitle(null);
      setTranslatedContent(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const [nextTitle, nextContent] = await Promise.all([
        translateText(post.title, "pt"),
        translateContent(post.content, "pt"),
      ]);
      if (!cancelled) {
        setTranslatedTitle(nextTitle);
        setTranslatedContent(nextContent);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post, lang]);

  const title = translatedTitle ?? post?.title ?? "";
  const content = translatedContent ?? post?.content ?? "";

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

  // Assign anchor IDs to the rendered headings and track the active section.
  useEffect(() => {
    if (!contentRef.current || headings.length === 0) return;

    const els = Array.from(contentRef.current.querySelectorAll("h2, h3"));
    let idx = 0;
    els.forEach((el) => {
      const text = (el.textContent ?? "").trim();
      if (!text) return; // matches extractHeadings, which skips empty headings
      if (headings[idx]) el.id = headings[idx].id;
      idx++;
    });

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
  }, [headings, content]);

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
            <Link href={`/u/${post.username}`} className="post-entry__author">
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
              <Link href={`/u/${post.username}/${post.id}/edit`} className="btn btn--pill btn--pill-blue">
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
            ref={contentRef}
            className="post__content"
            dangerouslySetInnerHTML={{ __html: contentToHtml(content) }}
          />
          <TableOfContents headings={headings} activeId={activeId} />
        </div>
      </article>
    </main>
  );
}