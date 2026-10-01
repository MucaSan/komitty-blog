"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { listPosts } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container">
      <div className="feed-header">
        <div>
          <h1 className="feed-title">Latest posts</h1>
          <p className="feed-subtitle">
            Achievements in mathematics, physics, history and beyond.
          </p>
        </div>
        <Link href="/new" className="btn btn--primary">
          New post
        </Link>
      </div>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="empty">No posts yet. Be the first to share an achievement.</p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </main>
  );
}
