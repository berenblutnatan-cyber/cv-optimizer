import type { Metadata } from "next";
import { InterviewPrepClient } from "@/components/interview/InterviewPrepClient";

export const metadata: Metadata = {
  title: "AI Interview Prep | Hired",
  description: "Get the interview questions you're most likely to face, with STAR-format answers built from your own experience.",
};

export default function InterviewPrepPage() {
  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <InterviewPrepClient />
      </div>
    </main>
  );
}
