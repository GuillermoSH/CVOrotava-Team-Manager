import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppToaster from "@/components/ui/AppToaster";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CVOrotava Manager",
  description: "Plataforma privada para ver partidos, entrenamientos y más!",
  applicationName: "CV Manager",
  appleWebApp: {
    capable: true,
    title: "CV Manager",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0f",
};

const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('cvorotava-theme');
    document.documentElement.dataset.theme = (t === 'light' || t === 'dark') ? t : 'dark';
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
  try {
    document.documentElement.dataset.sidebar =
      localStorage.getItem('cvorotava-sidebar-collapsed') === '1' ? 'collapsed' : 'expanded';
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          id="cvorotava-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInit }}
        />
      </head>
      <body
        className={`${poppins.className} antialiased min-h-screen bg-[var(--color-bg)] text-[var(--text-primary)]`}
      >
        <ThemeProvider>
          {children}
          <AppToaster />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}