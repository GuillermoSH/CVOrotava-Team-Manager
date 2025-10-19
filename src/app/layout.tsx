import type { Metadata } from "next";
import { Poppins } from "next/font/google";
// @ts-ignore: side-effect import of CSS without types; add a `*.css` declaration file to avoid using ts-ignore
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${poppins.className} antialiased min-h-screen bg-gray-100`}>
        {children}
      </body>
    </html>
  );
}