"use client";

import { useClearBodyScrollLockOnNavigate } from "@/hooks/use-overlay-guards";

/** Clears leftover scroll-lock / pointer-events from Radix overlays after navigation. */
export default function OverlayRouteReset() {
  useClearBodyScrollLockOnNavigate();
  return null;
}
