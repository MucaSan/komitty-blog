"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { PostCard } from "@/components/PostCard";
import { useTranslation } from "@/components/LanguageProvider";
import { listUserPosts } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function UserPage() {
  const { t } = useTranslation();
  const params = useParams<{ username: string }>();
  const rawUsername = params?.username ?? "";

  // Next.js hands back the raw (still percent-encoded) URL segment, so decode it
  // before using it as a username (e.g. "Fang%20Yuan" -> "Fang Yuan").
  const username = useMemo(() => {
    try {
      return decodeURIComponent(rawUsername);
    } catch {
      return rawUsername;
    }
  }, [rawUsername]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const usernameRef = useRef(username);

  useEffect(() => {
    // Switching to another user starts back at page 1 without an extra fetch.
    if (usernameRef.current !== username) {
      usernameRef.current = username;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let cancelled = false;
    setLoading(true);
    listUserPosts(username, page)
      .then((res) => {
        if (cancelled) return;
        setPosts(res.posts);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        if (cancelled) return;
        setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username, page]);

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="container">
      <div className="profile__header">
        <h1 className="profile__username">@{username}</h1>
        <p className="profile__subtitle">
          {total} {t(total === 1 ? "home.post" : "home.posts")}
        </p>
      </div>

      {loading ? (
        <p className="empty">{t("post.loading")}</p>
      ) : posts.length === 0 ? (
        <p className="empty">{t("post.noPostsYet")}</p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
    </main>
  );
}
