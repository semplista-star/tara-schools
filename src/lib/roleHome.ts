import { StaffRole } from "@prisma/client";

// Única fuente de verdad para "a qué ruta va cada rol tras iniciar sesión".
// Usado tanto por el middleware (aislamiento por ruta) como por la página
// raíz (redirección post-login) — antes eran dos mapas separados y
// desincronizados, lo que dejaba SUPERADMIN sin destino tras el login.
export const ROLE_HOME: Record<StaffRole, string> = {
  ADMIN: "/admin",
  TUTOR: "/tutor",
  WELLBEING_REFERENT: "/referente",
  SUPERADMIN: "/control"
};
