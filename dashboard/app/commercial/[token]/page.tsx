import type { Metadata } from "next";
import { PublicCommercialPage } from "@/components/risk/public-commercial-page";

export const metadata: Metadata = {
  title: "Photos du véhicule · Readyline",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicCommercialPage token={token} />;
}
