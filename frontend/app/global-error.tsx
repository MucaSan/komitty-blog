"use client";

import { useEffect } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { isStaleBuildError, reloadForStaleBuild } from "@/lib/chunkReload";

// Last-resort boundary. It stands in for the root layout, so it renders its own
// <html>/<body>; useTranslation() still works here because the language context
// falls back to its default value when no provider is mounted above.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  const staleBuild = isStaleBuildError(error);

  useEffect(() => {
    if (staleBuild) reloadForStaleBuild();
  }, [staleBuild]);

  return (
    <html lang="en">
      <body>
        <main className="container">
          <div className="empty">
            <p>{t(staleBuild ? "errors.outdatedBuild" : "errors.somethingWentWrong")}</p>
            <button
              type="button"
              className="btn btn--pill btn--pill-blue"
              onClick={() => {
                if (staleBuild) window.location.reload();
                else reset();
              }}
            >
              {t("errors.reload")}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
