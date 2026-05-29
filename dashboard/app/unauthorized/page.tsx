import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-red-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-gray-950">Acces non autorise</h1>
        <p className="mt-2 text-sm text-gray-500">Votre role ne permet pas d&apos;acceder a cette page.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Retour au dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
