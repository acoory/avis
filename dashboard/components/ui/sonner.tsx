"use client";

import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ toastOptions, theme = "light", ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      theme={theme}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          error: "!border-0 !bg-[#dc2626] !text-white [&_[data-description]]:!text-white",
          success: "!border-0 !bg-[#16a34a] !text-white",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
