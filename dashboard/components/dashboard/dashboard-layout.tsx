"use client";

import { PropsWithChildren } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

export function DashboardLayout({ children }: PropsWithChildren) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isPrintPage = pathname?.includes("/print");

  return (
    <ProtectedRoute>
      {isPrintPage ? <div className="min-h-screen bg-gray-50">{children}</div> : null}
      {!isPrintPage ? (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
        </div>
      </div>
      ) : null}
    </ProtectedRoute>
  );
}
