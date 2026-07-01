"use client";

import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatLicensePlate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/business.service";
import { DashboardSummary } from "@/types/business";

type RepairRequestNotification = NonNullable<DashboardSummary["repairRequestNotifications"]>[number];

export function NotificationsButton() {
  const [notifications, setNotifications] = useState<RepairRequestNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void businessService
      .dashboardSummary()
      .then((summary) => setNotifications(summary.repairRequestNotifications ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setIsLoading(false));
  }, []);

  const count = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 shadow-sm transition hover:bg-gray-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          type="button"
          aria-label={count ? `${count} notification${count > 1 ? "s" : ""}` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {count ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm p-0">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-bold text-slate-950">Notifications</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Suivi prestataire recent</p>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading ? (
            <p className="px-3 py-4 text-sm font-medium text-slate-500">Chargement...</p>
          ) : notifications.length ? (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationLink key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <p className="px-3 py-4 text-sm font-medium text-slate-500">Aucune notification recente.</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationLink({ notification }: { notification: RepairRequestNotification }) {
  const check = notification.vehicleCheck;
  const isRecovered = notification.type === "VEHICLE_RECOVERED";

  return (
    <Link
      className="flex gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
      href={`/dashboard/vehicle-checks/${check.id}`}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          isRecovered ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700",
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-950">
          {formatLicensePlate(check.licensePlate, check.licensePlateCountry, check.licensePlateRaw)}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
          {isRecovered ? "Vehicule recupere" : "Demande prise en charge"}
        </span>
        {notification.externalRepairContact ? (
          <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
            {isRecovered ? "chez" : "par"} {externalRepairContactLabel(notification.externalRepairContact)}
          </span>
        ) : null}
        <span className={cn("mt-1 block text-xs font-semibold", isRecovered ? "text-blue-700" : "text-emerald-700")}>
          {formatShortDateTime(notification.eventAt)}
        </span>
      </span>
    </Link>
  );
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function externalRepairContactLabel(contact: NonNullable<RepairRequestNotification["externalRepairContact"]>) {
  return contact.companyName?.trim() || contact.name;
}
