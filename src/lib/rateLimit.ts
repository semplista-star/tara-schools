// Limitador en memoria, por instancia de función. No es un límite exacto
// ni compartido entre instancias serverless (para eso haría falta Redis/
// Vercel KV, que no tenemos aprovisionado) — es una mitigación honesta de
// "mejor esfuerzo" contra un abuso básico, no una garantía dura.
//
// Deliberadamente NUNCA se usa para rechazar el guardado de una alerta de
// seguridad real: una señal de seguridad no debe perderse nunca por un
// límite de peticiones. Se usa para tráfico rutinario (resúmenes de sesión)
// y para espaciar notificaciones repetidas.

const buckets = new Map<string, number[]>();

// Purga oportunista para no acumular memoria indefinidamente en una
// instancia de larga vida.
function prune(timestamps: number[], windowMs: number, now: number) {
  return timestamps.filter((t) => now - t < windowMs);
}

/** true si la petición está permitida; false si se ha superado el límite. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = prune(buckets.get(key) ?? [], windowMs, now);
  if (existing.length >= limit) {
    buckets.set(key, existing);
    return false;
  }
  existing.push(now);
  buckets.set(key, existing);
  return true;
}

const lastNotified = new Map<string, number>();

/** true si ya toca volver a notificar a alguien sobre este visitante. */
export function shouldNotify(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  const last = lastNotified.get(key);
  if (last && now - last < cooldownMs) return false;
  lastNotified.set(key, now);
  return true;
}
