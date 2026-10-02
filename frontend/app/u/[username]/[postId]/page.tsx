"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { TableOfContents } from "@/components/TableOfContents";
import { deletePost, listUserPosts } from "@/lib/api";
import { contentToHtml, contentToText, extractHeadings } from "@/lib/content";
import { getSession } from "@/lib/session";
import type { Post, Session } from "@/lib/types";

export default function PostPage() {
  const params = useParams<{ username: string; postId: string }>();
  const username = params?.username ?? "";
  const postId = params?.postId ?? "";

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  async function handleDelete() {
    if (!session || !post) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deletePost(post.id, session);
      router.push("/");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete post");
      setDeleting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    listUserPosts(username)
      .then((posts) => setPost(posts.find((p) => p.id === postId) ?? null))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [username, postId]);

  const headings = useMemo(
    () => (post ? extractHeadings(post.content) : []),
    [post],
  );

  const readingMinutes = useMemo(() => {
    if (!post) return 1;
    const words = contentToText(post.content)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [post]);

  // Assign anchor IDs to the rendered headings and track the active section.
  useEffect(() => {
    if (!contentRef.current || headings.length === 0) return;

    const els = contentRef.current.querySelectorAll("h2, h3");
    els.forEach((el, i) => {
      if (headings[i]) el.id = headings[i].id;
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
  }, [headings]);

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

  const date = new Date(post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="container container--post">
      <article className="post">
        <header className="post__header">
          <h1 className="post__title">{post.title}</h1>
          <div className="post__meta">
            <Link href={`/u/${post.username}`} className="post-entry__author">
              @{post.username}
            </Link>
            <span>·</span>
            <time>{date}</time>
            <span>·</span>
            <span>{readingMinutes} min read</span>
          </div>
          {mounted && session && session.user.id === post.userId && (
            <div className="post__actions">
              <Link href={`/u/${post.username}/${post.id}/edit`} className="btn btn--pill">
                Edit
              </Link>
              <button
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </header>

        <div className="post__body">
          <div
            ref={contentRef}
            className="post__content"
            dangerouslySetInnerHTML={{ __html: contentToHtml(post.content) }}
          />
          <TableOfContents headings={headings} activeId={activeId} />
        </div>
      </article>
    </main>
  );
}