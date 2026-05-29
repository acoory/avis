"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { UserDropdown } from "@/components/dashboard/user-dropdown";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          aria-label="Ouvrir la navigation"
          className="md:hidden"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link className="text-sm font-semibold text-gray-950 md:hidden" href="/dashboard">
          Vehicle Control
        </Link>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-950">Dashboard operationnel</p>
          <p className="text-xs text-gray-500">Socle pret pour les modules metier</p>
        </div>
      </div>
      <UserDropdown />
    </header>
  );
}
