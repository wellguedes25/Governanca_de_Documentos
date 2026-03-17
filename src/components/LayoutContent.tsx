"use client";

import Sidebar from "@/components/Sidebar";
import { useUI } from "@/context/UIContext";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUI();

  return (
    <div className="flex min-h-screen transition-all duration-300">
      <Sidebar />
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-8 transition-all duration-300 min-h-screen flex flex-col overflow-x-hidden`}>
        <div className="w-full h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
