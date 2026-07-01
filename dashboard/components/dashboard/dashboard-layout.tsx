"use client";

import { PropsWithChildren } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { NotificationsButton } from "@/components/dashboard/notifications-button";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";

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
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50/95 px-4 backdrop-blur md:h-16 md:justify-end md:px-6">
              <Button
                aria-label="Ouvrir la navigation"
                className="md:hidden"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <NotificationsButton />
            </header>
            <main className="min-w-0 flex-1 overflow-x-clip p-4 md:p-6">{children}</main>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
