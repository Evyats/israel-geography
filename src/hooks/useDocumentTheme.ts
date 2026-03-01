import { useEffect, useRef } from "react";

export function useDocumentTheme(isDarkMode: boolean) {
  const themeTransitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("lang", "he");
    document.documentElement.setAttribute("dir", "rtl");
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (themeTransitionTimerRef.current !== null) {
      window.clearTimeout(themeTransitionTimerRef.current);
    }

    root.classList.add("theme-transitioning");
    root.classList.toggle("dark", isDarkMode);

    const themeFadeDurationRaw = getComputedStyle(root).getPropertyValue("--theme-fade-duration").trim();
    const themeFadeMs = themeFadeDurationRaw.endsWith("ms")
      ? Number.parseFloat(themeFadeDurationRaw)
      : themeFadeDurationRaw.endsWith("s")
        ? Number.parseFloat(themeFadeDurationRaw) * 1000
        : 1200;

    themeTransitionTimerRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
      themeTransitionTimerRef.current = null;
    }, Number.isFinite(themeFadeMs) ? themeFadeMs : 1200);

    return () => {
      if (themeTransitionTimerRef.current !== null) {
        window.clearTimeout(themeTransitionTimerRef.current);
        themeTransitionTimerRef.current = null;
      }
    };
  }, [isDarkMode]);
}

