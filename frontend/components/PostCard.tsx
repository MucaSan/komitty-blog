import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/components/LanguageProvider";
import { contentToText } from "@/lib/content";
import { translateText } from "@/lib/translate";
import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  const { t, lang } = useTranslation();
  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(() => contentToText(post.content));

  // Translate the card title/excerpt when the user is reading in Portuguese.
  useEffect(() => {
    if (lang !== "pt") {
      setTitle(post.title);
      setExcerpt(contentToText(post.content));
      return;
    }

    let cancelled = false;
    (async () => {
      const [nextTitle, nextExcerpt] = await Promise.all([
        translateText(post.title, "pt"),
        translateText(contentToText(post.content), "pt"),
      ]);
      if (!cancelled) {
        setTitle(nextTitle);
        setExcerpt(nextExcerpt);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [post, lang]);

  const date = new Date(post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="post-entry">
      <h2 className="post-entry__title">
        <Link href={`/u/${post.username}/${post.id}`}>{title}</Link>
      </h2>
      <div className="post-entry__meta">
        <Link href={`/u/${post.username}`} className="post-entry__author">
          @{post.username}
        </Link>
        <span>·</span>
        <time>{date}</time>
      </div>
      <p className="post-entry__excerpt">{excerpt}</p>
      <Link href={`/u/${post.username}/${post.id}`} className="post-entry__more">
        {t("post.readMore")} →
      </Link>
    </article>
  );
}
