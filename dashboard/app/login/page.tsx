import { LoginForm } from "@/components/auth/login-form";
import { ReadylineBrand } from "@/components/branding/readyline-brand";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <ReadylineBrand priority size="large" />
          <h1 className="mt-8 text-3xl font-semibold text-gray-950">Bienvenue</h1>
          <p className="mt-2 text-sm text-gray-500">
            Pilotez les contrôles et le suivi des véhicules depuis un espace unique.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Connectez-vous pour accéder à votre tableau de bord.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
