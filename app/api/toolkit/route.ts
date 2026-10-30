import { auth } from "@clerk/nextjs/server";
import { clientIp } from "@/lib/limits";
import { freeToolsLeft } from "@/lib/toolkit/quota";
import { TOOL_IDS } from "@/lib/toolkit/tools";

export const dynamic = "force-dynamic";

// GET /api/toolkit — which tools still have today's free use for this caller.
export async function GET(request: Request) {
  const { userId } = await auth();
  const who = userId ? `u:${userId}` : `ip:${clientIp(request)}`;
  return Response.json({ free: await freeToolsLeft(TOOL_IDS, who), signedIn: !!userId });
}
