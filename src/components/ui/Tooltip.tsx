"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type TooltipGroupCtx = {
  skipDelay: boolean;
  markOpen: () => void;
  markClosed: () => void;
};

const TooltipGroupContext = createContext<TooltipGroupCtx | null>(null);

export function TooltipGroup({ children }: { children: React.ReactNode }) {
  const [skipDelay, setSkipDelay] = useState(false);
  const closeTimer = useRef<number>(0);
  const openCount = useRef(0);

  const markOpen = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    openCount.current += 1;
    setSkipDelay(true);
  }, []);

  const markClosed = useCallback(() => {
    openCount.current = Math.max(0, openCount.current - 1);
    if (openCount.current === 0) {
      closeTimer.current = window.setTimeout(() => setSkipDelay(false), 180);
    }
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  return (
    <TooltipGroupContext.Provider value={{ skipDelay, markOpen, markClosed }}>
      {children}
    </TooltipGroupContext.Provider>
  );
}

type TooltipProps = {
  label: string;
  children: React.ReactNode;
};

export default function Tooltip({ label, children }: TooltipProps) {
  const group = useContext(TooltipGroupContext);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number>(0);
  const visible = useRef(false);
  const touchPointer = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePos = useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;
    const rect = trigger.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;
    const pad = 8;
    let top = rect.top - tipRect.height - gap;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    if (top < pad) top = rect.bottom + gap;
    left = Math.min(
      Math.max(pad, left),
      window.innerWidth - tipRect.width - pad
    );
    setPos({ top, left });
  }, []);

  const hide = useCallback(() => {
    window.clearTimeout(showTimer.current);
    if (!visible.current) return;
    visible.current = false;
    group?.markClosed();
    setOpen(false);
    setPos(null);
  }, [group]);

  const show = useCallback(() => {
    window.clearTimeout(showTimer.current);
    if (visible.current) return;
    visible.current = true;
    group?.markOpen();
    setOpen(true);
  }, [group]);

  const scheduleShow = useCallback(() => {
    window.clearTimeout(showTimer.current);
    if (group?.skipDelay) {
      show();
      return;
    }
    showTimer.current = window.setTimeout(show, 280);
  }, [group?.skipDelay, show]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, updatePos, label]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePos();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, hide, updatePos]);

  useEffect(() => {
    return () => window.clearTimeout(showTimer.current);
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onPointerEnter={(e) => {
          touchPointer.current = e.pointerType === "touch";
          if (touchPointer.current) return;
          scheduleShow();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "touch") return;
          hide();
        }}
        onMouseEnter={() => {
          if (touchPointer.current) return;
          scheduleShow();
        }}
        onMouseLeave={() => {
          if (touchPointer.current) return;
          hide();
        }}
        onFocusCapture={scheduleShow}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {mounted && open
        ? createPortal(
            <div
              ref={tipRef}
              role="tooltip"
              aria-hidden="true"
              style={
                pos
                  ? { top: pos.top, left: pos.left }
                  : { top: 0, left: 0, visibility: "hidden" }
              }
              className="pointer-events-none fixed z-[110] rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] shadow-lg"
            >
              {label}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
