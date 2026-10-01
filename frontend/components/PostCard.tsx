import Link from "next/link";
import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  const date = new Date(post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="post-card">
      <h3 className="post-card__title">{post.title}</h3>
      <p className="post-card__excerpt">{post.content}</p>
      <div className="post-card__meta">
        <Link href={`/u/${post.username}`} className="post-card__author">
          @{post.username}
        </Link>
        <span>·</span>
        <span>{date}</span>
      </div>
    </article>
  );
}
