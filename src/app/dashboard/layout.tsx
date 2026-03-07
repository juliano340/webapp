import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      userEmail={session.user.email ?? "sem-email"}
      userRole={session.user.role}
    >
      {children}
    </DashboardShell>
  );
}
