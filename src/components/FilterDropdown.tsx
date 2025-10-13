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
      {/* Botón principal */}
      <button
        type="button"
        className={`w-full font-medium py-2 px-3 md:px-4 rounded-lg flex justify-between items-center transition-all duration-200
          ${
            value
              ? "bg-[#FF2E2E] text-white hover:bg-[#FF4646]"
              : "bg-[#2A2A2A] text-white/70 hover:bg-[#3A3A3A] hover:text-white"
          }
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value || label}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-1 md:ml-2"
        >
          <FontAwesomeIcon icon={faAngleDown} />
        </motion.span>
      </button>

      {/* Opciones con animación */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-10 mt-2 min-w-max w-full bg-[#141414] rounded-lg shadow-lg border border-white/10 max-h-60 overflow-y-auto text-xs"
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 transition-all duration-150
                  ${
                    option === value
                      ? "bg-[#FF2E2E] text-white"
                      : "text-white/80 hover:bg-[#2A2A2A] hover:text-white"
                  }
                `}
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
                className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/20 transition-all"
              >
                <FontAwesomeIcon icon={faTrash} className="mr-1" /> Limpiar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
