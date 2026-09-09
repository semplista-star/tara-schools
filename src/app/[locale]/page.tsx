import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { ROLE_HOME } from "@/lib/roleHome";

export default async function RootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect({ href: "/login", locale });
  redirect({ href: ROLE_HOME[session.user.role] ?? "/login", locale });
}
