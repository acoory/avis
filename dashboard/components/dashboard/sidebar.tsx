"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Calculator, ChevronDown, ChevronsUpDown, ClipboardList, Gauge, LogOut, MapPin, Settings, Users, Wrench, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { Role } from "@/types/auth";

type NavigationItem = {
  href?: string;
  icon: LucideIcon;
  label: string;
  roles?: Role[];
  sublabel?: string;
  comingSoon?: boolean;
  subItems?: NavigationItem[];
};

const navigationSections: Array<{ items: NavigationItem[]; label: string }> = [
  {
    label: "Menu principal",
    items: [{ label: "Tableau de bord", href: "/dashboard", icon: Gauge }],
  },
  {
    label: "Activite",
    items: [
      { label: "Controles", sublabel: "(Buy Back)", href: "/dashboard/vehicle-checks", icon: ClipboardList },
      { label: "Pièces & Main-d'œuvre", sublabel: "(Estimation)", href: "/dashboard/estimation", icon: Calculator, comingSoon: true },
    ],
  },
  {
    label: "Referentiels",
    items: [
      { label: "Types reparations", href: "/dashboard/repair-types", icon: Wrench, roles: ["ADMIN"] },
      { label: "Constructeurs", href: "/dashboard/manufacturers", icon: Building2, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Systeme",
    items: [
      {
        label: "Paramètres",
        icon: Settings,
        subItems: [
          { label: "Utilisateurs", href: "/dashboard/users", icon: Users, roles: ["ADMIN", "MANAGER"] },
          { label: "Agences", href: "/dashboard/agencies", icon: MapPin, roles: ["ADMIN"] },
        ],
      },
    ],
  },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set(["Paramètres"]),
  );

  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({
          ...item,
          subItems: item.subItems?.filter((sub) => !sub.roles || (user && sub.roles.includes(user.role))),
        }))
        .filter((item) => {
          if (item.subItems !== undefined) return (item.subItems?.length ?? 0) > 0;
          return !item.roles || (user && item.roles.includes(user.role));
        }),
    }))
    .filter((section) => section.items.length > 0);

  function toggleExpanded(label: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      logout();
      router.replace("/login");
    }
  }

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden", isOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform md:sticky md:inset-y-auto md:top-0 md:z-auto md:flex md:h-screen md:w-68 md:translate-x-0",
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
        <nav className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {visibleSections.map((section) => (
              <div key={section.label}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{section.label}</p>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    if (item.subItems !== undefined) {
                      const expanded = expandedItems.has(item.label);
                      const hasActiveChild = item.subItems.some(
                        (sub) => sub.href && (pathname === sub.href || pathname.startsWith(sub.href)),
                      );

                      return (
                        <div key={item.label}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 md:min-h-10",
                              hasActiveChild && "text-teal-800",
                            )}
                            onClick={() => toggleExpanded(item.label)}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                              <span className="truncate">{item.label}</span>
                              <ChevronDown
                                className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")}
                              />
                            </span>
                          </button>
                          {expanded && (
                            <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 pl-3">
                              {item.subItems.map((sub) => {
                                const SubIcon = sub.icon;
                                const active = sub.href ? pathname === sub.href || pathname.startsWith(sub.href) : false;
                                const accessBadge = sub.roles?.length ? accessBadgeLabel(sub.roles) : null;

                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href!}
                                    className={cn(
                                      "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 md:min-h-9",
                                      active && "bg-teal-50 text-teal-800",
                                    )}
                                    onClick={onClose}
                                  >
                                    <SubIcon className="h-3.5 w-3.5" />
                                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                      <span className="truncate">{sub.label}</span>
                                      {accessBadge ? (
                                        <span className={cn("shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500", active && "bg-teal-100 text-teal-700")}>
                                          {accessBadge}
                                        </span>
                                      ) : null}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const active = item.href ? (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))) : false;
                    const accessBadge = item.roles?.length ? accessBadgeLabel(item.roles) : null;

                    if (item.comingSoon) {
                      return (
                        <div
                          className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 opacity-60 md:min-h-10"
                          key={item.href}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="min-w-0 leading-tight">
                              <span className="block truncate">{item.label}</span>
                              {item.sublabel ? <span className="block text-[11px] font-normal text-gray-300">{item.sublabel}</span> : null}
                            </span>
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-600">
                              Bientôt
                            </span>
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 md:min-h-10",
                          active && "bg-teal-50 text-teal-800",
                        )}
                        href={item.href!}
                        key={item.href}
                        onClick={onClose}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="min-w-0 leading-tight">
                            <span className="block truncate">{item.label}</span>
                            {item.sublabel ? <span className={cn("block text-[11px] font-normal text-gray-400", active && "text-teal-700/70")}>{item.sublabel}</span> : null}
                          </span>
                          {accessBadge ? (
                            <span className={cn("shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500", active && "bg-teal-100 text-teal-700")}>
                              {accessBadge}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
        <div className="border-t border-gray-200 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-left shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                type="button"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                  {userInitials(user?.firstName, user?.lastName, user?.email)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-gray-950">{userDisplayName(user?.firstName, user?.lastName, user?.email)}</span>
                  <span className="mt-0.5 inline-flex rounded-full bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-teal-700">{user?.role ?? "Utilisateur"}</span>
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="mb-2 w-60 p-1.5" side="top">
              <div className="px-2 py-2">
                <p className="truncate text-sm font-semibold text-gray-950">{userDisplayName(user?.firstName, user?.lastName, user?.email)}</p>
                {user?.email ? <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p> : null}
                <p className="mt-1 text-[11px] font-bold uppercase text-teal-700">{user?.role ?? "Utilisateur"}</p>
              </div>
              <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />
              <DropdownMenuItem className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" />
                Deconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

function userInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join("");
  if (initials) return initials.toUpperCase();
  return email?.[0]?.toUpperCase() ?? "U";
}

function userDisplayName(firstName?: string | null, lastName?: string | null, email?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || email || "Compte";
}

function accessBadgeLabel(roles: Role[]) {
  if (roles.includes("ADMIN") && roles.includes("MANAGER")) return "Admin/Manager";
  if (roles.includes("ADMIN")) return "Admin";
  if (roles.includes("MANAGER")) return "Manager";
  return null;
}
