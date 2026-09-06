import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";

const roleHome: Record<string, string> = {
  ADMIN: "/admin",
  TUTOR: "/tutor",
  WELLBEING_REFERENT: "/referente"
};

export default async function RootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect({ href: "/login", locale });
  redirect({ href: roleHome[session.user.role] ?? "/login", locale });
}
