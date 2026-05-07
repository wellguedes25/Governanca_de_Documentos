import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { UIProvider } from "@/context/UIContext";
import LayoutContent from "@/components/LayoutContent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medlytics Pro - Clinical Analytics",
  description: "Monitoramento e Auditoria Inteligente de Documentos Clínicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${manrope.variable} antialiased`}
        suppressHydrationWarning
      >
        <UIProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
        </UIProvider>
      </body>
    </html>
  );
}
