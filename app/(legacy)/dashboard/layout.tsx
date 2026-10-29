import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { GradientShell } from "@/components/shell/GradientShell";
import { Sidebar } from "@/components/shell/Sidebar";

export const metadata = {
  title: "Dashboard · Hired",
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");
  return (
    <GradientShell>
      <Sidebar />
      <div className="md:pl-20 pb-24 md:pb-12">{children}</div>
    </GradientShell>
  );
}
