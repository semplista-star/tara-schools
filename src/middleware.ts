import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const roleHome: Record<string, string> = {
  ADMIN: "/admin",
  TUTOR: "/tutor",
  WELLBEING_REFERENT: "/referente"
};

const pathRole: Record<string, string> = {
  "/admin": "ADMIN",
  "/tutor": "TUTOR",
  "/referente": "WELLBEING_REFERENT"
};

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token as any)?.role as string | undefined;
    const path = req.nextUrl.pathname;
    const matchedPrefix = Object.keys(pathRole).find((prefix) => path.startsWith(prefix));

    // Aislamiento por rol: un tutor no puede entrar al panel de referente
    // de bienestar (donde están las alertas de seguridad) ni al de admin,
    // aunque conozca la URL.
    if (matchedPrefix && role && pathRole[matchedPrefix] !== role) {
      return NextResponse.redirect(new URL(roleHome[role] ?? "/login", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" }
  }
);

export const config = {
  matcher: ["/admin/:path*", "/tutor/:path*", "/referente/:path*", "/dashboard/:path*"]
};
