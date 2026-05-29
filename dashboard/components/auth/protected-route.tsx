"use client";

import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { LoadingScreen } from "@/components/dashboard/loading-screen";
import { useAuthStore } from "@/stores/auth.store";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !accessToken) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [accessToken, isHydrated, pathname, router]);

  if (!isHydrated || !accessToken) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
