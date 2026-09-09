// ID fijo (no cuid aleatorio) de la fila-ancla en School que no representa
// un centro real: solo existe como FK obligatorio para los StaffUser con
// rol SUPERADMIN y para los AuditLog generados desde /control. Se crea con
// este id explícito en prisma/seed.ts.
export const CENTRAL_SCHOOL_ID = "school_central";
