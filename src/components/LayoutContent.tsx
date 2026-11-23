"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { usePathname } from "next/navigation";
import { useUI } from "@/context/UIContext";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toggleSidebar } = useUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ocultar shell apenas nas páginas públicas (home e tela de conexão)
  const isPublicPage = pathname === "/" || pathname === "/connect";
  const showNav = !isPublicPage;

  // Atalhos globais: Cmd+K (Busca) e Cmd+B (Dobrar Sidebar em Dock)
  useEffect(() => {
    if (!showNav) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !isEditable) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNav, toggleSidebar]);

  if (!showNav) {
    return (
      <div className="flex flex-col min-h-screen sylva-canvas text-[var(--foreground)]">
        <main suppressHydrationWarning className="flex-1 flex flex-col">
          <div className="w-full h-full flex flex-col">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen sylva-canvas text-[var(--foreground)] selection:bg-[var(--lime)] selection:text-[var(--lime-ink)]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main
          suppressHydrationWarning
          className="flex-1 px-4 md:px-7 lg:px-9 pt-5 pb-12"
        >
          <div className="w-full max-w-[1600px] mx-auto flex flex-col">{children}</div>
        </main>
      </div>
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
