import nodemailer from "nodemailer";

// Envío de correo real vía SMTP. Si no hay credenciales configuradas en
// este centro, isMailConfigured() devuelve false y quien llame debe
// mostrarlo honestamente en la interfaz — nunca simular un envío que no
// ha ocurrido.
export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    });
  }
  return transporter;
}

export async function sendMail(params: { to: string; subject: string; text: string }) {
  if (!isMailConfigured()) {
    throw new Error("El envío de correo no está configurado (faltan variables SMTP_*).");
  }
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: params.to,
    subject: params.subject,
    text: params.text
  });
}
