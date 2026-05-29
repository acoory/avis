"use client";

import { LogOut, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export function UserDropdown() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      logout();
      router.replace("/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Menu utilisateur" variant="ghost">
          <UserCircle className="h-5 w-5" />
          <span className="hidden sm:inline">{user?.firstName ?? "Compte"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2 py-2">
          <p className="text-sm font-medium text-gray-950">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500">{user?.email}</p>
          <p className="mt-1 text-xs font-medium text-teal-700">{user?.role}</p>
        </div>
        <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Deconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
