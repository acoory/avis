import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Vehicle Control</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-950">Gestion operationnelle</h1>
          <p className="mt-2 text-sm text-gray-500">Socle securise pour le controle et le suivi des vehicules.</p>
          <p className="mt-4 text-sm text-gray-500">Connectez-vous pour acceder au dashboard.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
