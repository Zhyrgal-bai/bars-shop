import { useSyncExternalStore } from "react";

const MD_QUERY = "(min-width: 768px)";

function subscribeResize(cb: () => void) {
  const mq = window.matchMedia(MD_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getServerSnapshot() {
  return false;
}

/** `true` при ширине ≥768px (Tailwind `md`). */
export function useMediaMd(): boolean {
  return useSyncExternalStore(
    subscribeResize,
    () => window.matchMedia(MD_QUERY).matches,
    getServerSnapshot
  );
}
