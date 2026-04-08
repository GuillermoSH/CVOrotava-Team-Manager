"use client";

import { useTheme } from "@/contexts/ThemeContext";

export default function AmbientBackground() {
  const { theme } = useTheme();
  const light = theme === "light";

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[-1] overflow-hidden transition-colors duration-500 ${
        light ? "bg-[#eef0f4]" : "bg-[#09090b]"
      }`}
    >
      <div
        className={`absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[130px] transition-colors duration-500 ${
          light ? "bg-red-400/25" : "bg-red-900/10"
        }`}
      />
      <div
        className={`absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[140px] transition-colors duration-500 ${
          light ? "bg-violet-400/20" : "bg-purple-900/10"
        }`}
      />
      <div
        className={`absolute top-[40%] left-[20%] w-[30vw] h-[30vw] rounded-full blur-[120px] transition-colors duration-500 ${
          light ? "bg-sky-300/15" : "bg-blue-900/5"
        }`}
      />
      <div
        className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay transition-opacity duration-500 ${
          light ? "opacity-[0.04]" : "opacity-[0.03]"
        }`}
      />
    </div>
  );
}
