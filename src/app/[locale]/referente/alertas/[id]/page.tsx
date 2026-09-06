import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { Link } from "@/i18n/navigation";
import SignOutButton from "@/components/SignOutButton";
import SeverityBadge from "@/components/SeverityBadge";
import AlertStatusBadge from "@/components/AlertStatusBadge";
import { acknowledgeAlert, addAlertNote, requestAdditionalContext, resolveAlert } from "@/app/[locale]/referente/actions";

export default async function AlertDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "alertDetail" });
  const user = await requireStaff(["WELLBEING_REFERENT"]);

  const alert = await prisma.safetyAlert.findUnique({
    where: { id },
    include: {
      student: { include: { group: true } },
      assignedReferent: true,
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!alert || alert.schoolId !== user.schoolId) notFound();

  await logAudit({
    schoolId: user.schoolId,
    actorId: user.id,
    action: "VIEW_SAFETY_ALERT",
    targetType: "SafetyAlert",
    targetId: alert.id
  });

  const dateOptions: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">{t("panelLabel")}</p>
          <h1 className="text-lg font-semibold text-ink">{t("heading")}</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="p-6 max-w-2xl mx-auto w-full flex-1 space-y-6">
        <Link href="/referente" className="inline-flex items-center gap-1.5 text-sm text-inksoft hover:text-accent">
          <IconArrowLeft size={16} stroke={2} aria-hidden="true" />
          {t("back")}
        </Link>

        <div className="bg-panel border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <SeverityBadge severity={alert.severity} />
            <AlertStatusBadge status={alert.status} />
          </div>

          <h2 className="text-ink text-lg font-semibold">
            {alert.student.alias} <span className="text-muted font-normal">· {alert.student.group.name}</span>
          </h2>

          <p className="text-inksoft mt-3">{alert.summary}</p>

          <dl className="text-sm text-muted mt-4 space-y-1">
            <div>
              <dt className="inline">{t("createdLabel")}: </dt>
              <dd className="inline">{alert.createdAt.toLocaleString(locale, dateOptions)}</dd>
            </div>
            {alert.assignedReferent && (
              <div>
                <dt className="inline">{t("assignedLabel")}: </dt>
                <dd className="inline">{alert.assignedReferent.name}</dd>
              </div>
            )}
            {alert.resolvedAt && (
              <div>
                <dt className="inline">{t("resolvedLabel")}: </dt>
                <dd className="inline">{alert.resolvedAt.toLocaleString(locale, dateOptions)}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-2 mt-5">
            {alert.status === "OPEN" && (
              <form action={acknowledgeAlert}>
                <input type="hidden" name="alertId" value={alert.id} />
                <button className="bg-accent-dark text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90">
                  {t("acknowledgeButton")}
                </button>
              </form>
            )}
            {alert.status !== "RESOLVED" && (
              <form action={resolveAlert}>
                <input type="hidden" name="alertId" value={alert.id} />
                <button className="border border-border text-inksoft rounded-md px-4 py-2 text-sm font-medium hover:border-success hover:text-success">
                  {t("resolveButton")}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="bg-panel border border-border rounded-lg p-6">
          <h3 className="text-ink font-medium mb-1">{t("contextHeading")}</h3>
          <p className="text-muted text-xs mb-3">{t("contextNote")}</p>
          <form action={requestAdditionalContext} className="flex flex-col gap-2">
            <input type="hidden" name="alertId" value={alert.id} />
            <label htmlFor="reason" className="text-sm text-inksoft">
              {t("contextReasonLabel")}
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={2}
              className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
            />
            <button className="self-start border border-border text-inksoft rounded-md px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent">
              {t("contextSubmit")}
            </button>
          </form>
        </div>

        <div className="bg-panel border border-border rounded-lg p-6">
          <h3 className="text-ink font-medium mb-3">{t("notesHeading")}</h3>
          <form action={addAlertNote} className="flex flex-col gap-2 mb-5">
            <input type="hidden" name="alertId" value={alert.id} />
            <label htmlFor="text" className="text-sm text-inksoft">
              {t("noteFieldLabel")}
            </label>
            <textarea
              id="text"
              name="text"
              required
              rows={3}
              className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
            />
            <button className="self-start bg-accent-dark text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90">
              {t("noteSubmit")}
            </button>
          </form>

          {alert.notes.length === 0 ? (
            <p className="text-muted text-sm">{t("noNotes")}</p>
          ) : (
            <ul className="space-y-3">
              {alert.notes.map((note) => (
                <li key={note.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                  <p className="text-ink text-sm">{note.text}</p>
                  <p className="text-muted text-xs mt-1">
                    {note.author.name} · {note.createdAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
