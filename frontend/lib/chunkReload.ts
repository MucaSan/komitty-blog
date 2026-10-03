// Recovering from a stale build.
//
// `next build` rewrites the hashed files under /_next/static on every deploy, so
// a browser that is still holding the previous build keeps asking for chunk
// files that no longer exist: an open tab navigating to a route it has not
// loaded yet, a document being hydrated while the deploy wipes `.next`, or a
// prefetch that started before the deploy. Next then gives up with the opaque
// "Application error: a client-side exception has occurred while loading …"
// screen, and the only way out is loading the new build — i.e. a hard reload.
//
// The app-wide error boundaries (app/error.tsx, app/global-error.tsx) use this
// helper to detect that situation and do the reload for the reader instead of
// leaving them on a dead end. The deploy procedure in deploy/README.md keeps the
// previous generation's chunks around as well, so most readers never notice.

const RELOAD_STAMP = "komitty_chunk_reload_at";

// A reload that does not help (e.g. the network is down) must not turn into an
// endless refresh loop, so a page reloads itself at most once per cooldown.
const RELOAD_COOLDOWN_MS = 30_000;

// webpack/browsers word a missing chunk differently, and React rethrows the
// original error in `cause`, so every level of the chain is inspected.
const STALE_BUILD_PATTERNS = [
  /ChunkLoadError/,
  /Loading chunk [\w.-]+ failed/,
  /Failed to fetch dynamically imported module/,
  /error loading dynamically imported module/,
  /Importing a module script failed/,
  // A 404/HTML error page served where a chunk was expected.
  /Unexpected token '</,
];

export function isStaleBuildError(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; current != null && depth < 5; depth++) {
    const { name, message } = current as { name?: unknown; message?: unknown };
    const text = `${typeof name === "string" ? name : ""} ${
      typeof message === "string" ? message : ""
    }`;
    if (STALE_BUILD_PATTERNS.some((pattern) => pattern.test(text))) return true;

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

// Reloads the page so it picks up the current build. Returns true when a reload
// was started (false while the cooldown is still running).
export function reloadForStaleBuild(): boolean {
  if (typeof window === "undefined") return false;

  let lastReload = 0;
  try {
    lastReload = Number(window.sessionStorage.getItem(RELOAD_STAMP) ?? 0);
  } catch {
    // Storage can be unavailable (private mode); the cooldown is best effort.
  }
  if (lastReload && Date.now() - lastReload < RELOAD_COOLDOWN_MS) return false;

  try {
    window.sessionStorage.setItem(RELOAD_STAMP, String(Date.now()));
  } catch {
    // Ignore: reloading is more important than remembering that we did.
  }

  window.location.reload();
  return true;
}
