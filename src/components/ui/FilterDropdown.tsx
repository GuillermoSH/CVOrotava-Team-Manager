"use client";

import { faAngleDown, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DropdownProps = {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
};

export default function FilterDropdown({ label, options, value, onChange }: Readonly<DropdownProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left text-xs" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        className={`font-medium py-2 px-3.5 rounded-lg flex items-center gap-2 transition-all duration-200 border ${
          value
            ? "bg-[var(--accent-muted)] text-red-400 border-red-500/25 hover:bg-red-500/25"
            : "bg-[var(--glass-surface)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-surface-hover)] hover:text-[var(--text-primary)]"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value || label}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FontAwesomeIcon icon={faAngleDown} className="text-[10px]" />
        </motion.span>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-10 mt-1.5 min-w-max w-full bg-[var(--color-bg-elevated)] rounded-lg shadow-xl shadow-black/40 border border-white/8 max-h-60 overflow-y-auto text-xs"
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-3.5 py-2.5 transition-all duration-150 first:rounded-t-lg ${
                  option === value
                    ? "bg-[var(--accent-muted)] text-red-400"
                    : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
                }`}
              >
                {option}
              </button>
            ))}

            {value && (
              <button
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="w-full text-left px-3.5 py-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 transition-all rounded-b-lg border-t border-white/5"
              >
                <FontAwesomeIcon icon={faTrash} className="mr-1.5" />
                Limpiar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
