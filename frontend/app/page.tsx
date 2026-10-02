"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { PostCard } from "@/components/PostCard";
import { useTranslation } from "@/components/LanguageProvider";
import { listPosts } from "@/lib/api";
import { getSession, onSessionChange } from "@/lib/session";
import type { Post, Session } from "@/lib/types";

export default function HomePage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
    const update = () => setSession(getSession());
    update();
    setMounted(true);
    return onSessionChange(update);
  }, []);

  return (
    <main className="container">
      <header className="masthead">
        <Logo size={56} />
        <h1 className="masthead__title">komitty</h1>
        <p className="masthead__tagline">{t("home.tagline")}</p>
      </header>

      <div className="feed-toolbar">
        <span className="feed-toolbar__count">
          {posts.length} {t(posts.length === 1 ? "home.post" : "home.posts")}
        </span>
        {mounted && session && (
          <Link href="/new" className="btn btn--primary">
            {t("home.writePost")}
          </Link>
        )}
      </div>

      <div className="post-list">
        {loading ? (
          <p className="empty">{t("home.loading")}</p>
        ) : posts.length === 0 ? (
          <p className="empty">{t("home.noPosts")}</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </main>
  );
}
