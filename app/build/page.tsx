import { redirect } from "next/navigation";

// /build is the canonical "make me a CV" entry — the chat builder is the
// main interface; /build/voice (hands-free call) and /builder (manual
// wizard) stay available as alternatives.
export default function BuildPage() {
  redirect("/build/chat");
}
