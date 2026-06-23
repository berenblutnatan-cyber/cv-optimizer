import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ApplicationsBoard } from "@/components/applications/ApplicationsBoard";

export const metadata: Metadata = {
  title: "Job Tracker | Hired",
  description: "Track every job you're applying to and tailor your CV to each one.",
};
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {userId ? (
          <ApplicationsBoard />
        ) : (
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-[#0A2647]">Track your job applications</h1>
            <p className="mt-2 text-stone-600 max-w-md mx-auto">
              Sign in to save the roles you&apos;re chasing — and tailor your CV to each one with AI.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] transition-colors"
            >
              Sign in to start
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
