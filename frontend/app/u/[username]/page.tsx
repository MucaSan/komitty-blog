"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { listUserPosts } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function UserPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";

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
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="empty">This user hasn&apos;t posted anything yet.</p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </main>
  );
}
