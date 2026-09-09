import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CENTRAL_SCHOOL_ID } from "@/lib/central";
import { createSchool, createStaffAccount } from "@/app/[locale]/control/actions";

const ROLE_OPTIONS = ["ADMIN", "TUTOR", "WELLBEING_REFERENT"] as const;

export default async function ControlAccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "controlAccounts" });
  const tRole = await getTranslations({ locale, namespace: "staffRole" });
  await requireStaff(["SUPERADMIN"]);

  const [schools, staff] = await Promise.all([
    prisma.school.findMany({ where: { id: { not: CENTRAL_SCHOOL_ID } }, orderBy: { name: "asc" } }),
    prisma.staffUser.findMany({
      where: { schoolId: { not: CENTRAL_SCHOOL_ID } },
      include: { school: true },
      orderBy: [{ school: { name: "asc" } }, { name: "asc" }]
    })
  ]);

  return (
    <>
      <section className="bg-panel border border-border rounded-lg p-6">
        <h2 className="text-ink font-medium mb-1">{t("newSchoolHeading")}</h2>
        <p className="text-muted text-xs mb-4">{t("newSchoolNote")}</p>
        <form action={createSchool} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="schoolName" className="text-sm text-inksoft block mb-1">
              {t("schoolNameLabel")}
            </label>
            <input
              id="schoolName"
              name="name"
              required
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
            />
          </div>
          <button className="bg-accent-dark text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90">
            {t("createSchoolButton")}
          </button>
        </form>
      </section>

      <section className="bg-panel border border-border rounded-lg p-6">
        <h2 className="text-ink font-medium mb-1">{t("newAccountHeading")}</h2>
        <p className="text-muted text-xs mb-4">{t("newAccountNote")}</p>
        {schools.length === 0 ? (
          <p className="text-muted text-sm">{t("noSchoolsYet")}</p>
        ) : (
          <form action={createStaffAccount} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="staffSchool" className="text-sm text-inksoft block mb-1">
                {t("schoolLabel")}
              </label>
              <select
                id="staffSchool"
                name="schoolId"
                required
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
              >
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="staffRole" className="text-sm text-inksoft block mb-1">
                {t("roleLabel")}
              </label>
              <select
                id="staffRole"
                name="role"
                required
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {tRole(role)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="staffName" className="text-sm text-inksoft block mb-1">
                {t("nameLabel")}
              </label>
              <input
                id="staffName"
                name="name"
                required
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="staffEmail" className="text-sm text-inksoft block mb-1">
                {t("emailLabel")}
              </label>
              <input
                id="staffEmail"
                name="email"
                type="email"
                required
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="staffPassword" className="text-sm text-inksoft block mb-1">
                {t("passwordLabel")}
              </label>
              <input
                id="staffPassword"
                name="password"
                type="text"
                required
                minLength={8}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-light focus:border-accent"
              />
              <p className="text-muted text-xs mt-1">{t("passwordHint")}</p>
            </div>
            <button className="sm:col-span-2 self-start bg-accent-dark text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90">
              {t("createAccountButton")}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="text-ink font-medium mb-3">{t("existingAccountsHeading")}</h2>
        <div className="bg-panel border border-border rounded-lg divide-y divide-border">
          {staff.length === 0 ? (
            <p className="text-muted text-sm p-4">{t("noAccountsYet")}</p>
          ) : (
            staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 p-4 flex-wrap">
                <div>
                  <p className="text-ink text-sm font-medium">{member.name}</p>
                  <p className="text-muted text-xs">
                    {member.email} · {member.school.name}
                  </p>
                </div>
                <span className="text-xs font-medium text-inksoft bg-canvas border border-border rounded-full px-2.5 py-1">
                  {tRole(member.role)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
