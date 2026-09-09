// Política de retención para los datos del chat público (soytara.com).
// Son valores por defecto razonables, no una cifra legal fija — el RGPD
// exige un límite proporcionado ("limitación del plazo de conservación"),
// pero el número concreto es una decisión de negocio que debe confirmar
// el equipo, no algo que se pueda fijar de forma puramente técnica.
// Configurables por variable de entorno sin tocar código.
export const PUBLIC_USAGE_RETENTION_DAYS = Number(process.env.PUBLIC_USAGE_RETENTION_DAYS ?? 180);
export const PUBLIC_ALERT_RETENTION_DAYS = Number(process.env.PUBLIC_ALERT_RETENTION_DAYS ?? 365);
