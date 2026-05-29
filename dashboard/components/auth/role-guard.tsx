"use client";

import { useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { useAuthStore } from "@/stores/auth.store";
import { Role } from "@/types/auth";

type RoleGuardProps = PropsWithChildren<{
  roles: Role[];
}>;

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const isAllowed = Boolean(user && roles.includes(user.role));

  useEffect(() => {
    if (isHydrated && user && !isAllowed) {
      router.replace("/unauthorized");
    }
  }, [isAllowed, isHydrated, router, user]);

  if (!isHydrated || !user) {
    return <LoadingScreen />;
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
