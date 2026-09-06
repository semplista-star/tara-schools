import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const roleHome: Record<string, string> = {
  ADMIN: "/admin",
  TUTOR: "/tutor",
  WELLBEING_REFERENT: "/referente"
};

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  redirect(roleHome[session.user.role] ?? "/login");
}
