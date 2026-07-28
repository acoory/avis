"use client";

import { useEffect } from "react";

const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let updateInterval: number | null = null;
    let isRefreshing = false;
    let isRefreshPending = false;
    let hasController = Boolean(navigator.serviceWorker.controller);
    let isDisposed = false;

    function checkForUpdate() {
      if (document.visibilityState === "visible") {
        void registration?.update();
      }
    }

    function reloadIfUpdateIsPending() {
      if (!isRefreshPending || isRefreshing) return false;

      isRefreshing = true;
      window.location.reload();
      return true;
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (!reloadIfUpdateIsPending()) checkForUpdate();
    }

    function handleFocus() {
      if (!reloadIfUpdateIsPending()) checkForUpdate();
    }

    function handleControllerChange() {
      if (!hasController) {
        hasController = true;
        return;
      }

      isRefreshPending = true;
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    void navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((nextRegistration) => {
        if (isDisposed) return;

        registration = nextRegistration;
        void registration.update();
        updateInterval = window.setInterval(
          checkForUpdate,
          UPDATE_INTERVAL_MS,
        );
      })
      .catch(() => {
        // Le navigateur réessaiera l’enregistrement au prochain chargement.
      });

    return () => {
      isDisposed = true;
      if (updateInterval !== null) window.clearInterval(updateInterval);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return null;
}
