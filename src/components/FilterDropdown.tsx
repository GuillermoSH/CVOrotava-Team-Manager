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
    <div className="relative inline-block text-left text-xs text-gray-800" ref={dropdownRef}>
      {/* Botón */}
      <button
        type="button"
        className={`w-full font-medium py-2 px-2 md:px-4 rounded-lg flex justify-between items-center transition
          ${value 
            ? "bg-[#12E7DC] text-gray-800 hover:bg-[#12E7DC] font-semibold" 
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"}
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
            className="absolute z-10 mt-2 min-w-max w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto text-xs"
          >
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-xs transition ${
                  option === value ? "bg-[#12E7DC] text-gray-800 hover:bg-[#12E7DC]/50 font-semibold" : "hover:bg-gray-100"
                }`}
              >
                {option}
              </button>
            ))}
            <button
              onClick={() => {
                onChange("");
                setIsOpen(false);
            }}
              className={`w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-100
                ${!value ? "hidden" : ""} transition"
              `}
            >
              <FontAwesomeIcon icon={faTrash} /> Limpiar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
