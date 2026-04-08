"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "@/contexts/ThemeContext";

type ThemeToggleProps = {
  /** Compact = icon only (navbar). Expanded = pill with label (login, etc.). */
  variant?: "compact" | "expanded";
  className?: string;
};

export default function ThemeToggle({
  variant = "compact",
  className = "",
}: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isLight = theme === "light";

  const base =
    "inline-flex items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]";

  const sizing =
    variant === "compact"
      ? "h-9 w-9 sm:h-9 sm:w-9"
      : "gap-2 px-3.5 py-2 text-sm font-medium";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!mounted}
      aria-label={isLight ? "Activar modo oscuro" : "Activar modo claro"}
      title={isLight ? "Modo oscuro" : "Modo claro"}
      className={`${base} ${sizing} border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--text-secondary)] hover:bg-[var(--glass-surface-hover)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)] disabled:opacity-60 ${className}`}
    >
      <FontAwesomeIcon
        icon={isLight ? faMoon : faSun}
        className={variant === "compact" ? "text-sm" : "text-xs"}
      />
      {variant === "expanded" && (
        <span className="hidden sm:inline">
          {isLight ? "Oscuro" : "Claro"}
        </span>
      )}
    </button>
  );
}
