import Link from "next/link";
import { IconFileDownload } from "@tabler/icons-react";
import SignOutButton from "@/components/SignOutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Panel de administración</p>
          <h1 className="text-lg font-semibold text-ink">Tara Centros</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/export"
            className="inline-flex items-center gap-1.5 text-sm text-inksoft border border-border rounded-md px-3 py-1.5 hover:border-accent hover:text-accent"
          >
            <IconFileDownload size={16} stroke={2} aria-hidden="true" />
            Exportar informe (PDF)
          </a>
          <SignOutButton />
        </div>
      </header>
      <nav className="bg-panel border-b border-border px-6 flex gap-1" aria-label="Secciones de administración">
        {[
          { href: "/admin", label: "Resumen" },
          { href: "/admin/grupos", label: "Grupos y tutores" },
          { href: "/admin/alumnado", label: "Alumnado y consentimiento" }
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2.5 text-sm text-inksoft border-b-2 border-transparent hover:text-accent hover:border-accent-light"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
