import type { AlertSeverity } from "@prisma/client";

// Categorías que Tara puede emitir en el tag [ALERTA_SEGURETAT:CATEGORIA] del
// system prompt (ver el bloque SEGURETAT). Deben mantenerse en sync con ese
// texto — si se añade una categoría nueva ahí, añadir aquí su severidad.
export const SAFETY_CATEGORY_SEVERITY: Record<string, AlertSeverity> = {
  IDEACIO_SUICIDA: "CRITICAL",
  ABUS: "CRITICAL",
  PERILL_IMMEDIAT: "CRITICAL",
  BULLYING_FISIC: "HIGH",
  AMENACES: "HIGH",
  ALTRE: "MEDIUM"
};

export function severityForCategory(category: string): AlertSeverity {
  return SAFETY_CATEGORY_SEVERITY[category] ?? "MEDIUM";
}

// Límites defensivos: esto es un endpoint público sin autenticación de
// usuario (solo un secreto compartido embebido en el frontend estático de
// soytara.com, que cualquiera con acceso al código fuente de la página
// puede leer — ver nota en el propio route.ts). No es una frontera de
// seguridad fuerte, así que como mínimo evitamos que un payload malformado
// o abusivo llegue a la base de datos.
export const MAX_CODI_LEN = 64;
export const MAX_LANG_LEN = 8;
export const MAX_STRING_LEN = 300;

export function clampString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}
