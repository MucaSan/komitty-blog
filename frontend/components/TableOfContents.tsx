import { useTranslation } from "@/components/LanguageProvider";
import type { Heading } from "@/lib/content";

export function TableOfContents({
  headings,
  activeId,
}: {
  headings: Heading[];
  activeId: string | null;
}) {
  const { t } = useTranslation();
  if (headings.length === 0) return null;

  return (
    <nav className="toc" aria-label={t("post.onThisPage")}>
      <p className="toc__title">{t("post.onThisPage")}</p>
      <ul className="toc__list">
        {headings.map((h) => (
          <li
            key={h.id}
            className={`toc__item toc__item--level-${h.level}${
              activeId === h.id ? " toc__item--active" : ""
            }`}
          >
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}