import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const roleHome: Record<string, string> = {
  ADMIN: "admin",
  TUTOR: "tutor",
  WELLBEING_REFERENT: "referente",
  SUPERADMIN: "control"
};

const pathRole: Record<string, string> = {
  admin: "ADMIN",
  tutor: "TUTOR",
  referente: "WELLBEING_REFERENT",
  control: "SUPERADMIN"
};

// Middleware combinado: primero aplica el aislamiento por rol (igual que
// antes de introducir next-intl), leyendo el token de NextAuth
// directamente porque next-auth/middleware no se puede anidar dentro de
// otro middleware. Después delega en next-intl para la gestión del
// prefijo de idioma.
export default async function middleware(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const hasLocalePrefix = routing.locales.includes(segments[0] as (typeof routing.locales)[number]);
  const locale = hasLocalePrefix ? segments[0] : routing.defaultLocale;
  const firstSegment = hasLocalePrefix ? segments[1] : segments[0];

  if (firstSegment && pathRole[firstSegment]) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }

    const role = token.role as string | undefined;
    if (role && pathRole[firstSegment] !== role) {
      return NextResponse.redirect(new URL(`/${locale}/${roleHome[role] ?? "login"}`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"]
};
