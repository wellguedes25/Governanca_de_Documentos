"use client";

import Sidebar from "@/components/Sidebar";
import { useUI } from "@/context/UIContext";
import { usePathname } from 'next/navigation';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { docVersion } = useUI();
  const pathname = usePathname();
  
  // Ocultar nav na home ou se não houver versão selecionada
  const showNav = pathname !== '/' && docVersion !== null;

  // Determinar se aplicamos padding global (Dashboard tem layout assimétrico próprio)
  const isDashboard = pathname === '/dashboard';
  const mainPadding = isDashboard ? '' : 'px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8';

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
