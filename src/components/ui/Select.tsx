"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCheck } from "@fortawesome/free-solid-svg-icons";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectGroup = {
  label: string;
  options: SelectOption[];
};

export type SelectOptions = (SelectOption | SelectGroup)[];

function isGroup(opt: SelectOption | SelectGroup): opt is SelectGroup {
  return "options" in opt && Array.isArray((opt as SelectGroup).options);
}

export function flattenSelectOptions(options: SelectOptions): SelectOption[] {
  return options.flatMap((opt) => (isGroup(opt) ? opt.options : [opt]));
}

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type MenuRow =
  | { type: "group"; label: string }
  | { type: "option"; option: SelectOption; index: number };

type SelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOptions;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  size?: "form" | "compact";
  "aria-label"?: string;
};

export default function Select({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Selecciona una opción",
  disabled = false,
  error = false,
  className = "",
  size = "form",
  "aria-label": ariaLabel,
}: SelectProps) {
  const reduceMotion = useReducedMotion();
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typeBuffer = useRef("");
  const typeTimer = useRef<number>(0);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const flat = useMemo(() => flattenSelectOptions(options), [options]);
  const menuRows = useMemo(() => {
    const rows: MenuRow[] = [];
    let i = 0;
    for (const opt of options) {
      if (isGroup(opt)) {
        rows.push({ type: "group", label: opt.label });
        for (const sub of opt.options) {
          rows.push({ type: "option", option: sub, index: i });
          i += 1;
        }
      } else {
        rows.push({ type: "option", option: opt, index: i });
        i += 1;
      }
    }
    return rows;
  }, [options]);

  const selected = flat.find((o) => o.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePos = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const maxH = 240;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const placeAbove = spaceBelow < 120 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(maxH, placeAbove ? spaceAbove : spaceBelow);
    setPos({
      top: placeAbove ? rect.top - maxHeight - gap : rect.bottom + gap,
      left: rect.left,
      width: Math.max(rect.width, size === "compact" ? 12 * 16 : rect.width),
      maxHeight: Math.max(120, maxHeight),
    });
  }, [size]);

  const close = useCallback(
    (focusTrigger = true) => {
      setOpen(false);
      if (focusTrigger) triggerRef.current?.focus();
      onBlur?.();
    },
    [onBlur]
  );

  useLayoutEffect(() => {
    if (!open) return;
    const idx = flat.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    updatePos();
  }, [open, flat, value, updatePos]);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      close(false);
    };

    const onReposition = () => updatePos();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
        return;
      }
      if (e.key === "Tab") {
        close(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => {
          if (flat.length === 0) return 0;
          const next = i < 0 ? 0 : i + 1;
          return Math.min(flat.length - 1, next);
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i < 0 ? 0 : i - 1));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(Math.max(0, flat.length - 1));
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const opt = flat[activeIndex];
        if (opt) {
          onChange(opt.value);
          close();
        }
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        window.clearTimeout(typeTimer.current);
        typeBuffer.current += e.key.toLocaleLowerCase("es");
        const start = typeBuffer.current;
        const idx = flat.findIndex((o) =>
          o.label.toLocaleLowerCase("es").startsWith(start)
        );
        if (idx >= 0) setActiveIndex(idx);
        typeTimer.current = window.setTimeout(() => {
          typeBuffer.current = "";
        }, 600);
      }
    };

    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("keydown", onKey, true);
      window.clearTimeout(typeTimer.current);
    };
  }, [open, flat, activeIndex, onChange, close, updatePos]);

  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const triggerSize =
    size === "compact"
      ? "min-h-9 px-3 py-2 text-sm"
      : "mt-1 min-h-[2.75rem] p-3 text-sm";

  return (
    <>
      <div className={`relative ${size === "form" ? "w-full" : ""} ${className}`}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={ariaLabel}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border text-left transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${triggerSize} ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-[var(--accent)]"
          } ${open ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25" : ""}`}
        >
          <span
            className={`min-w-0 truncate ${
              selected
                ? "text-[var(--text-primary)]"
                : "text-[color:var(--form-placeholder)]"
            }`}
          >
            {selected?.label ?? placeholder}
          </span>
          <motion.span
            className="shrink-0 text-[var(--text-muted)]"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <FontAwesomeIcon icon={faAngleDown} className="text-[11px]" />
          </motion.span>
        </button>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={menuRef}
                id={listboxId}
                role="listbox"
                aria-labelledby={id}
                aria-activedescendant={
                  activeIndex >= 0
                    ? `${listboxId}-opt-${activeIndex}`
                    : undefined
                }
                initial={
                  reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -6, scale: 0.98 }
                }
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  maxHeight: pos.maxHeight,
                }}
                className="z-[110] overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] py-1 shadow-xl shadow-black/25"
              >
                {menuRows.map((row) => {
                  if (row.type === "group") {
                    return (
                      <div
                        key={`g-${row.label}`}
                        role="presentation"
                        className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        {row.label}
                      </div>
                    );
                  }

                  const { option, index } = row;
                  return (
                    <OptionRow
                      key={option.value || `empty-${index}`}
                      id={`${listboxId}-opt-${index}`}
                      index={index}
                      label={option.label}
                      active={index === activeIndex}
                      selected={option.value === value}
                      onHover={() => setActiveIndex(index)}
                      onPick={() => {
                        onChange(option.value);
                        close();
                      }}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function OptionRow({
  id,
  index,
  label,
  active,
  selected,
  onHover,
  onPick,
}: {
  id: string;
  index: number;
  label: string;
  active: boolean;
  selected: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      data-index={index}
      aria-selected={selected}
      onMouseEnter={onHover}
      onClick={onPick}
      className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
        active
          ? "bg-[var(--accent-muted)] text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-faint)] hover:text-[var(--text-primary)]"
      } ${selected ? "font-semibold" : ""} ${
        selected && !active ? "text-[var(--text-primary)]" : ""
      }`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {selected ? (
        <FontAwesomeIcon icon={faCheck} className="shrink-0 text-[11px]" />
      ) : null}
    </button>
  );
}
