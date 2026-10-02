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

  // Always translate the card to the selected language: choosing EN turns a
  // Portuguese post into English and choosing PT does the reverse. Text that is
  // already in the target language is returned unchanged by translateText().
  useEffect(() => {
    let cancelled = false;
    const originalExcerpt = contentToText(post.content);

    // Show the original immediately while the translation is in flight.
    setTitle(post.title);
    setExcerpt(originalExcerpt);

    (async () => {
      const [nextTitle, nextExcerpt] = await Promise.all([
        translateText(post.title, lang),
        translateText(originalExcerpt, lang),
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
        <Link href={`/u/${encodeURIComponent(post.username)}/${post.id}`}>{title}</Link>
      </h2>
      <div className="post-entry__meta">
        <Link href={`/u/${encodeURIComponent(post.username)}`} className="post-entry__author">
          @{post.username}
        </Link>
        <span>·</span>
        <time>{date}</time>
      </div>
      <p className="post-entry__excerpt">{excerpt}</p>
      <Link href={`/u/${encodeURIComponent(post.username)}/${post.id}`} className="post-entry__more">
        {t("post.readMore")} →
      </Link>
    </article>
  );
}
