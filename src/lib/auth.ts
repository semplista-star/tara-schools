import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { checkRateLimit } from "@/lib/rateLimit";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "text" },
        password: { label: "Contraseña", type: "password" },
        totp: { label: "Código de verificación", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        // Máximo 8 intentos cada 5 minutos por cuenta — frena tanto fuerza
        // bruta de contraseña como de código TOTP.
        if (!checkRateLimit(`login:${email}`, 8, 5 * 60 * 1000)) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        const staff = await prisma.staffUser.findUnique({ where: { email } });
        if (!staff) return null;

        const valid = await bcrypt.compare(credentials.password, staff.passwordHash);
        if (!valid) return null;

        // 2FA obligatoria para SUPERADMIN una vez configurada (ver
        // /2fa-setup). Mientras no la haya configurado, se le deja entrar
        // para que el propio panel le fuerce a configurarla.
        if (staff.role === "SUPERADMIN" && staff.totpEnabledAt && staff.totpSecret) {
          if (!credentials.totp) throw new Error("TOTP_REQUIRED");
          if (!(await verifyTotp(credentials.totp, staff.totpSecret))) throw new Error("TOTP_INVALID");
        }

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          schoolId: staff.schoolId
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).schoolId = token.schoolId;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
