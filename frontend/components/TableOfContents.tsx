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
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                const el = document.getElementById(h.id);
                // If the anchor is missing, let the browser handle the click.
                if (!el) return;
                e.preventDefault();
                // Offset by the sticky navbar so the heading is fully visible.
                const top = el.getBoundingClientRect().top + window.scrollY - 84;
                window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
                window.history.replaceState(null, "", `#${h.id}`);
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}