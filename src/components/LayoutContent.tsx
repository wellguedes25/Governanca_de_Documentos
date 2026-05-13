"use client";

import Sidebar from "@/components/Sidebar";
import { useUI } from "@/context/UIContext";
import { usePathname } from 'next/navigation';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, docVersion } = useUI();
  const pathname = usePathname();
  
  // Ocultar sidebar na home ou se não houver versão selecionada
  const showSidebar = pathname !== '/' && docVersion !== null;

  return (
    <div className="flex min-h-screen transition-all duration-300">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 transition-all duration-300 min-h-screen flex flex-col overflow-x-hidden ${showSidebar ? (sidebarOpen ? 'ml-64 p-8' : 'ml-20 p-8') : 'ml-0'}`}>
        <div className="w-full h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
