"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Reset stuck Radix dialog/sheet body locks after client-side navigation. */
export function useClearBodyScrollLockOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.removeProperty("pointer-events");
    document.body.style.removeProperty("overflow");
    document.body.removeAttribute("data-scroll-locked");
  }, [pathname]);
}

/** Close an overlay whenever the route changes. */
export function useCloseOnRouteChange(onClose: () => void) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);
}

/** Close an overlay when the viewport becomes desktop-sized (md+). */
export function useCloseOnDesktop(
  isOpen: boolean,
  onClose: () => void,
  minWidthPx = 768
) {
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidthPx}px)`);

    const handleChange = () => {
      if (mq.matches && isOpen) onClose();
    };

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [isOpen, onClose, minWidthPx]);
}
