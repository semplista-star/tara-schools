import { AlertSeverity } from "@prisma/client";
import { isMailConfigured, sendMail } from "@/lib/mail";

// Severidades que despiertan a alguien de verdad. MEDIUM/LOW quedan solo
// en el panel — avisar de todo diluiría la urgencia de lo que sí importa.
const NOTIFY_SEVERITIES: AlertSeverity[] = ["CRITICAL", "HIGH"];

function recipients(): string[] {
  return (process.env.ALERT_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

const CATEGORY_LABEL: Record<string, string> = {
  IDEACIO_SUICIDA: "Ideación suicida o autolesión",
  ABUS: "Abuso físico, sexual o psicológico",
  BULLYING_FISIC: "Bullying físico con violencia",
  AMENACES: "Extorsión o amenazas",
  PERILL_IMMEDIAT: "Peligro inmediato",
  ALTRE: "Otra (sin categoría específica)"
};

// Se llama justo después de crear una alerta de seguridad (hoy solo desde
// el chat público; el día que exista un flujo equivalente para centros,
// debe llamarse igual desde ahí). No lanza si falla: una alerta ya
// guardada en el panel no debe perderse ni bloquear la respuesta por un
// problema de envío de correo — pero si falla, queda en el log del
// servidor para poder detectarlo.
export async function notifyCriticalAlert(params: {
  id: string;
  severity: AlertSeverity;
  category: string;
  source: "public_web" | "school";
}) {
  if (!NOTIFY_SEVERITIES.includes(params.severity)) return;

  const to = recipients();
  if (to.length === 0) {
    console.error("notifyCriticalAlert: ALERT_NOTIFY_EMAILS no está configurada — nadie recibe el aviso.");
    return;
  }
  if (!isMailConfigured()) {
    console.error("notifyCriticalAlert: correo no configurado (faltan variables SMTP_*) — nadie recibe el aviso.");
    return;
  }

  const label = CATEGORY_LABEL[params.category] ?? params.category;
  const sourceLabel = params.source === "public_web" ? "chat público (soytara.com)" : "un centro educativo";
  const link =
    params.source === "public_web"
      ? `https://tara-schools.vercel.app/es/control/alertas/${params.id}`
      : `https://tara-schools.vercel.app/es/referente`;

  for (const email of to) {
    try {
      await sendMail({
        to: email,
        subject: `[Tara · ${params.severity}] Alerta de seguridad — ${label}`,
        text: `Se ha activado el protocolo de seguridad en ${sourceLabel}.\n\nGravedad: ${params.severity}\nCategoría: ${label}\n\nRevísala aquí: ${link}\n\nEste aviso se envía solo para alertas de gravedad alta o crítica.`
      });
    } catch (err) {
      console.error(`notifyCriticalAlert: fallo enviando a ${email}:`, err);
    }
  }
}
