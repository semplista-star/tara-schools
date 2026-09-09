import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampString, severityForCategory, MAX_CODI_LEN, MAX_LANG_LEN, MAX_STRING_LEN } from "@/lib/publicIngest";
import { notifyCriticalAlert } from "@/lib/alertNotify";
import { checkRateLimit, shouldNotify } from "@/lib/rateLimit";

// Endpoint que soytara.com/chat llama directamente desde el navegador para
// que la actividad del chat público (fuera de cualquier centro educativo)
// aparezca en el centro de control (/control). No hay autenticación de
// usuario real: soytara.com es una página estática pública, así que el
// "secreto" en X-Ingest-Secret vive embebido en su código fuente y
// cualquiera puede leerlo con "ver código fuente" — es el mismo nivel de
// exposición que ya tenía SHEETS_URL en ese mismo archivo. Esto es
// telemetría de mejor esfuerzo para dar visibilidad operativa, no una
// frontera de seguridad. Nunca se envía ni se guarda aquí texto literal de
// conversación — solo categorías anonimizadas, igual que en el resto del
// esquema (ver PublicSafetyAlert/PublicUsageSummary en schema.prisma).

const ALLOWED_ORIGINS = new Set([
  "https://soytara.com",
  "https://www.soytara.com",
  "https://soctara.com",
  "https://www.soctara.com",
  "https://iatara.com",
  "https://www.iatara.com"
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://soytara.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Ingest-Secret",
    Vary: "Origin"
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  const secret = process.env.INGEST_SECRET;
  if (!secret || req.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers });
  }

  const codi = clampString(body.codi, MAX_CODI_LEN);
  const lang = clampString(body.lang, MAX_LANG_LEN) ?? "es";
  if (!codi) {
    return NextResponse.json({ error: "missing_codi" }, { status: 400, headers });
  }

  const visitor = await prisma.publicVisitor.upsert({
    where: { codi },
    update: { lang },
    create: { codi, lang }
  });

  if (body.type === "safety_alert") {
    // Nunca se limita ni se rechaza: una señal de seguridad real no debe
    // perderse jamás por un límite de peticiones.
    const category = clampString(body.category, 40) ?? "ALTRE";
    const identityHint = clampString(body.identityHint, MAX_STRING_LEN);
    const severity = severityForCategory(category);
    const alert = await prisma.publicSafetyAlert.create({
      data: {
        visitorId: visitor.id,
        severity,
        category,
        identityHint
      }
    });

    // Como mucho un aviso cada 15 minutos por visitante: si alguien manda
    // varias alertas seguidas, todas quedan guardadas, pero no se satura
    // el correo de quien las revisa.
    if (shouldNotify(`alert:${visitor.id}`, 15 * 60 * 1000)) {
      await notifyCriticalAlert({ id: alert.id, severity, category, source: "public_web" });
    }

    return NextResponse.json({ ok: true, id: alert.id }, { headers });
  }

  if (body.type === "session_summary") {
    // Tráfico rutinario: aquí sí aplicamos un límite básico, por visitante
    // y por IP (esta última evita que alguien inunde la tabla creando
    // "codis" nuevos sin parar).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`summary:${visitor.id}`, 20, 10 * 60 * 1000) || !checkRateLimit(`ip:${ip}`, 60, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers });
    }
    const mode = clampString(body.mode, 20) ?? "normal";
    const sentiment = clampString(body.sentiment, MAX_STRING_LEN);
    const necessitat = clampString(body.necessitat, MAX_STRING_LEN);
    const tornCount = Number.isFinite(body.tornCount) ? Math.max(0, Math.min(500, Math.trunc(body.tornCount))) : 0;
    const summary = await prisma.publicUsageSummary.create({
      data: { visitorId: visitor.id, mode, sentiment, necessitat, tornCount }
    });
    return NextResponse.json({ ok: true, id: summary.id }, { headers });
  }

  return NextResponse.json({ error: "unknown_type" }, { status: 400, headers });
}
