"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Car,
  ClipboardList,
  Gauge,
  MapPin,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Buy Back", href: "/dashboard", icon: Gauge },
  { label: "Controles", href: "/dashboard/vehicle-checks", icon: ClipboardList },
  { label: "Agences", href: "/dashboard/agencies", icon: MapPin },
  { label: "Utilisateurs", href: "/dashboard/users", icon: Users },
  { label: "Vehicules", href: "/dashboard/vehicles", icon: Car },
  { label: "Types reparations", href: "/dashboard/repair-types", icon: Wrench },
  { label: "Constructeurs", href: "/dashboard/manufacturers", icon: Building2 },
  { label: "Rapports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Parametres", href: "/dashboard/settings", icon: Settings },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-gray-200 bg-white transition-transform md:static md:z-auto md:block md:w-68 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 md:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Vehicle Control</p>
            <p className="text-xs text-gray-500">Operations internes</p>
          </div>
          <Button aria-label="Fermer la navigation" className="md:hidden" size="icon" type="button" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="space-y-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 md:h-10",
                  active && "bg-teal-50 text-teal-800",
                )}
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
