"use client";

import { useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false
    });

    setLoading(false);
    if (res?.error) {
      setError("Correo electrónico o contraseña incorrectos.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-panel border border-border rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-ink mb-1">Tara Centros</h1>
        <p className="text-inksoft text-sm mb-8">
          Panel para centros educativos. Progreso agregado y anónimo del alumnado.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={emailId} className="block text-sm text-inksoft mb-1">
              Correo electrónico
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 bg-canvas focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor={passwordId} className="block text-sm text-inksoft mb-1">
              Contraseña
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 bg-canvas focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
            />
          </div>

          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white rounded-md py-2.5 font-medium hover:bg-accent-dark disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-muted mt-6">
          El acceso lo gestiona el centro educativo. Contacta con la administración si no tienes cuenta.
        </p>
      </div>
    </div>
  );
}
