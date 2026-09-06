import { getServerSession } from "next-auth";
import { StaffRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";

export class UnauthorizedError extends Error {
  status = 401;
}

export class ForbiddenError extends Error {
  status = 403;
}

// Usar en cada API route y server component protegido: garantiza que hay
// una sesión válida y, si se indica, que el rol está entre los permitidos.
// Nunca confiar en un schoolId/role enviado por el cliente: siempre se lee
// de la sesión firmada del servidor.
export async function requireStaff(allowedRoles?: StaffRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new UnauthorizedError("No autenticado");
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new ForbiddenError("Rol sin permiso para este recurso");
  }
  return session.user;
}
