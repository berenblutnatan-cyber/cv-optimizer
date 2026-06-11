import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { GradientShell } from "@/components/shell/GradientShell";
import { ChatBuilderClient } from "@/components/chat/ChatBuilderClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tell us your story · Hired" };

export default async function ChatBuilderPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/build/chat");
  return (
    <GradientShell>
      <ChatBuilderClient />
    </GradientShell>
  );
}
