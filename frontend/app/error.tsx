"use client";

import { useEffect } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { isStaleBuildError, reloadForStaleBuild } from "@/lib/chunkReload";

// Root error boundary. As well as replacing Next's bare "Application error: a
// client-side exception has occurred" screen with something readable, this is
// where a stale build recovers itself: once a deploy has replaced the hashed
// chunks, a reload is the only way to pick up the new document (and with it the
// chunks that exist now). See lib/chunkReload.ts.
export default function Error({
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
    <main className="container">
      <div className="empty">
        <p>{t(staleBuild ? "errors.outdatedBuild" : "errors.somethingWentWrong")}</p>
        <button
          type="button"
          className="btn btn--pill btn--pill-blue"
          onClick={() => {
            // Re-rendering the same tree cannot work when its chunks are gone.
            if (staleBuild) window.location.reload();
            else reset();
          }}
        >
          {t("errors.reload")}
        </button>
      </div>
    </main>
  );
}
