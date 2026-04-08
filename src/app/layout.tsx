import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CVOrotava Manager",
  description: "Plataforma privada para ver partidos, entrenamientos y más!",
};

const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('cvorotava-theme');
    document.documentElement.dataset.theme = (t === 'light' || t === 'dark') ? t : 'dark';
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${poppins.className} antialiased min-h-screen bg-[var(--color-bg)] text-[var(--text-primary)]`}
      >
        <Script
          id="cvorotava-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInit }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}