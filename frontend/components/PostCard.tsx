import Link from "next/link";
import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  const date = new Date(post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="post-entry">
      <h2 className="post-entry__title">
        <Link href={`/u/${post.username}/${post.id}`}>{post.title}</Link>
      </h2>
      <div className="post-entry__meta">
        <Link href={`/u/${post.username}`} className="post-entry__author">
          @{post.username}
        </Link>
        <span>·</span>
        <time>{date}</time>
      </div>
      <p className="post-entry__excerpt">{post.content}</p>
      <Link href={`/u/${post.username}/${post.id}`} className="post-entry__more">
        Read more →
      </Link>
    </article>
  );
}
