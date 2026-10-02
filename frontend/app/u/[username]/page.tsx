"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listUserPosts(username)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [username]);

  return (
    <main className="container">
      <div className="profile__header">
        <h1 className="profile__username">@{username}</h1>
        <p className="profile__subtitle">
          {posts.length} {t(posts.length === 1 ? "home.post" : "home.posts")}
        </p>
      </div>

      {loading ? (
        <p className="empty">{t("post.loading")}</p>
      ) : posts.length === 0 ? (
        <p className="empty">{t("post.noPostsYet")}</p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </main>
  );
}
