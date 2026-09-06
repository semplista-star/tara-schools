"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-inksoft border border-border rounded-md px-3 py-1.5 hover:border-accent hover:text-accent"
    >
      Cerrar sesión
    </button>
  );
}
