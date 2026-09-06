// Regla de k-anonimato: no se muestra ninguna agregación a nivel de grupo
// si el grupo tiene menos de este número de alumnos activos (con
// consentimiento familiar concedido). Por debajo de este umbral, un dato
// agregado podría permitir identificar a un alumno/a concreto/a.
export const K_ANONYMITY_MIN = 5;

export function meetsKAnonymity(activeCount: number): boolean {
  return activeCount >= K_ANONYMITY_MIN;
}
