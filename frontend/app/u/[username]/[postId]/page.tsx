"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listUserPosts } from "@/lib/api";
import { contentToHtml } from "@/lib/content";
import type { Post } from "@/lib/types";

export default function PostPage() {
  const params = useParams<{ username: string; postId: string }>();
  const username = params?.username ?? "";
  const postId = params?.postId ?? "";

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listUserPosts(username)
      .then((posts) => setPost(posts.find((p) => p.id === postId) ?? null))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [username, postId]);

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
    month: "long",
    day: "numeric",
  });

  return (
    <main className="container">
      <article className="post">
        <h1 className="post__title">{post.title}</h1>
        <div className="post__meta">
          <Link href={`/u/${post.username}`} className="post-entry__author">
            @{post.username}
          </Link>
          <span>·</span>
          <time>{date}</time>
        </div>
        <div
          className="post__content"
          dangerouslySetInnerHTML={{ __html: contentToHtml(post.content) }}
        />
      </article>
    </main>
  );
}