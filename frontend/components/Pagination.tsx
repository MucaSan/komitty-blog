"use client";

import { useTranslation } from "@/components/LanguageProvider";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label={t("pagination.label")}>
      <button
        type="button"
        className="btn btn--pill"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← {t("pagination.previous")}
      </button>
      <span className="pagination__status">
        {t("pagination.page", { page: String(page), total: String(totalPages) })}
      </span>
      <button
        type="button"
        className="btn btn--pill"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t("pagination.next")} →
      </button>
    </nav>
  );
}
