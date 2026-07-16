"use client";

import Link from "next/link";
import { Bell, Car, Check, CheckCircle2, MessageSquareText, UserRoundPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/business.service";
import { AppNotification } from "@/types/conversations";

export function NotificationsButton() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await businessService.notifications();
      setNotifications(response.items);
      setUnreadCount(response.unreadCount);
    } catch {
      if (!silent) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 30_000);
    const handleFocus = () => void load(true);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [load]);

  function markRead(notification: AppNotification) {
    if (notification.readAt) return;
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, readAt: now } : item)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    void businessService.markNotificationRead(notification.id).catch(() => void load(true));
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    setUnreadCount(0);
    try {
      await businessService.markAllNotificationsRead();
    } catch {
      void load(true);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={
            unreadCount
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Notifications"
          }
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 shadow-sm transition hover:bg-gray-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          type="button"
        >
          <Bell className="h-4 w-4" />
          {unreadCount ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-700 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm p-0">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Notifications</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {unreadCount ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est a jour"}
            </p>
          </div>
          {unreadCount ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
              type="button"
              onClick={() => void markAllRead()}
            >
              <Check className="h-3.5 w-3.5" />
              Tout lire
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading ? (
            <p className="px-3 py-5 text-sm text-slate-500">Chargement...</p>
          ) : notifications.length ? (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationLink
                  key={notification.id}
                  notification={notification}
                  onOpen={() => markRead(notification)}
                />
              ))}
            </div>
          ) : (
            <p className="px-3 py-5 text-sm text-slate-500">Aucune notification.</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationLink({ notification, onOpen }: { notification: AppNotification; onOpen: () => void }) {
  return (
    <Link
      className={cn(
        "flex gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500",
        !notification.readAt && "bg-teal-50/70",
      )}
      href={notification.route}
      onClick={onOpen}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          !notification.readAt ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500",
        )}
      >
        <NotificationIcon type={notification.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold text-slate-950">{notification.title}</span>
          {!notification.readAt ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-600" /> : null}
        </span>
        {notification.excerpt ? (
          <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-500">{notification.excerpt}</span>
        ) : null}
        <span className="mt-1 block text-[11px] text-slate-400">
          {formatShortDateTime(notification.createdAt)}
        </span>
      </span>
    </Link>
  );
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "CONVERSATION_PARTICIPANT_ADDED") return <UserRoundPlus className="h-4 w-4" />;
  if (type === "CONVERSATION_MESSAGE" || type === "CONVERSATION_STATUS_CHANGED") {
    return <MessageSquareText className="h-4 w-4" />;
  }
  if (type === "VEHICLE_RECOVERED") return <CheckCircle2 className="h-4 w-4" />;
  return <Car className="h-4 w-4" />;
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
