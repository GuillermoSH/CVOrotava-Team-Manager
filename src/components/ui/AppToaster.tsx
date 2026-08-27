"use client";

import { Toaster } from "sileo";
import "sileo/styles.css";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Root toast host (Sileo). Place once in the app layout.
 * `theme` matches the page: Sileo uses inverted surfaces (dark page → light toast).
 * Fill/text also mirrored in `--sileo-toast-*` so mid-switch stays in sync.
 */
export default function AppToaster() {
  const { theme } = useTheme();

  return <Toaster position="top-right" theme={theme} />;
}
