"use client";

import { useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("login");
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
      setError(t("error"));
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-panel border border-border rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-ink mb-1">Tara Centros</h1>
        <p className="text-inksoft text-sm mb-8">{t("subtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={emailId} className="block text-sm text-inksoft mb-1">
              {t("email")}
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
              {t("password")}
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
            className="w-full bg-accent-dark text-white rounded-md py-2.5 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>

        <p className="text-xs text-muted mt-6">{t("helpText")}</p>
      </div>
    </div>
  );
}
