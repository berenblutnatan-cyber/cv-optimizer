import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Star, MessageSquare, Users, TrendingUp, Calendar, Mail, Globe } from "lucide-react";

// Admin emails that can access this page
const ADMIN_EMAILS = [
  "idan.kars@gmail.com", // Add your email here
];

async function isAdmin() {
  const { userId } = await auth();
  if (!userId) return false;
  
  // For now, we'll check if the user exists and has admin email
  // In production, you'd want a proper role system
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  
  return user && ADMIN_EMAILS.includes(user.email);
}

export default async function AdminFeedbackPage() {
  // Check authentication
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Check admin access
  const adminAccess = await isAdmin();
  if (!adminAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">
            You don&apos;t have permission to view this page. Contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Fetch feedback data
  const feedback: Awaited<ReturnType<typeof prisma.feedback.findMany>> =
    await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    });

  // Calculate stats
  const totalCount = feedback.length;
  const averageRating = totalCount > 0
    ? feedback.reduce((sum: number, f: { rating: number }) => sum + f.rating, 0) /
      totalCount
    : 0;
  
  // Rating distribution
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: feedback.filter(f => f.rating === rating).length,
    percentage: totalCount > 0 
      ? (feedback.filter(f => f.rating === rating).length / totalCount) * 100 
      : 0,
  }));

  // Recent feedback (with comments)
  const feedbackWithComments = feedback.filter(f => f.comment);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Feedback Dashboard</h1>
              <p className="text-slate-500 text-sm">View and analyze user feedback</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Average Rating */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Avg Rating</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-slate-500">/5</span>
            </div>
            <div className="mt-2 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Total Feedback */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Total Feedback</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalCount}</div>
            <p className="mt-1 text-sm text-slate-500">
              {feedbackWithComments.length} with comments
            </p>
          </div>

          {/* 5-Star Percentage */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">5-Star Rate</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">
                {totalCount > 0 ? Math.round(ratingDistribution[4].percentage) : 0}
              </span>
              <span className="text-slate-500">%</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {ratingDistribution[4].count} excellent ratings
            </p>
          </div>

          {/* Identified Users */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-600">Identified</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {feedback.filter(f => f.userId).length}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {feedback.filter(f => !f.userId).length} anonymous
            </p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Rating Distribution</h2>
          <div className="space-y-3">
            {ratingDistribution.reverse().map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm font-medium text-slate-700">{rating}</span>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-20 text-right">
                  <span className="text-sm font-medium text-slate-900">{count}</span>
                  <span className="text-sm text-slate-500 ml-1">({Math.round(percentage)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">All Feedback</h2>
            <p className="text-sm text-slate-500">Sorted by most recent</p>
          </div>
          
          {feedback.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No feedback yet</h3>
              <p className="text-slate-500">Feedback will appear here once users start rating.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {feedback.map((item) => (
                <div key={item.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Rating Stars */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= item.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-slate-200 text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          item.rating >= 4 
                            ? "bg-indigo-100 text-indigo-700" 
                            : item.rating >= 3 
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {item.rating === 5 ? "Excellent" : item.rating === 4 ? "Great" : item.rating === 3 ? "Good" : item.rating === 2 ? "Fair" : "Poor"}
                        </span>
                      </div>

                      {/* Comment */}
                      {item.comment ? (
                        <p className="text-slate-700 text-sm mb-2">&quot;{item.comment}&quot;</p>
                      ) : (
                        <p className="text-slate-400 text-sm italic mb-2">No comment provided</p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                        {item.user?.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {item.user.email}
                          </div>
                        )}
                        {item.source && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            {item.source}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
