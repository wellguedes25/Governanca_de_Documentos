"use client";

import Sidebar from "@/components/Sidebar";
import { useUI } from "@/context/UIContext";
import { usePathname } from 'next/navigation';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { docVersion } = useUI();
  const pathname = usePathname();
  
  // Ocultar nav na home, tela de conexão ou se não houver versão selecionada
  const isPublicPage = pathname === '/' || pathname === '/connect';
  const showNav = !isPublicPage && docVersion !== null;

  // Determinar se aplicamos padding global (Dashboard tem layout assimétrico próprio)
  // Todas as páginas autenticadas controlam seu próprio padding e espaçamento interno de forma limpa e consistente
  const mainPadding = '';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main App Layout wrapper */}
      {showNav && <Sidebar />}
      <main 
        suppressHydrationWarning
        className={`flex-1 flex flex-col ${showNav ? 'pt-20 md:pt-24' : 'pt-0'} ${mainPadding}`}
      >
        <div className="w-full h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
