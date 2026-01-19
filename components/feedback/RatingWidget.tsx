"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, X, Star, Send, Check, Loader2 } from "lucide-react";

type WidgetState = "button" | "rating" | "comment" | "submitting" | "success";

interface RatingWidgetProps {
  source?: string;
}

export function RatingWidget({ source }: RatingWidgetProps) {
  const [state, setState] = useState<WidgetState>("button");
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  // Auto-close success message
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => {
        setState("button");
        setRating(0);
        setComment("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleStarClick = (value: number) => {
    setRating(value);
    setState("comment");
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setState("submitting");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
          source: source || window.location.pathname,
        }),
      });

      if (response.ok) {
        setState("success");
      } else {
        setState("comment");
        console.error("Failed to submit feedback");
      }
    } catch (error) {
      setState("comment");
      console.error("Error submitting feedback:", error);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  if (state === "button") {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group">
        <button
          onClick={handleDismiss}
          className="bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full shadow border border-slate-200 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={() => setState("rating")}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full shadow-lg transition-all hover:scale-105"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Feedback</span>
        </button>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white rounded-xl shadow-2xl border border-emerald-200 p-6 w-80 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-800">Thank You!</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-80 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50 rounded-t-xl">
        <span className="font-semibold text-sm text-slate-700">
          {state === "rating" ? "Rate Experience" : "Add Details"}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setState("button")} className="p-1 hover:bg-slate-200 rounded text-slate-500">
             <div className="w-3 h-0.5 bg-current translate-y-1"></div>
          </button>
          <button onClick={handleDismiss} className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleStarClick(val)}
              onMouseEnter={() => setHoveredRating(val)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  val <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-slate-100 text-slate-300"
                }`}
              />
            </button>
          ))}
        </div>

        {(state === "comment" || state === "submitting") && (
          <div className="space-y-3 animate-in fade-in">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you think..."
              // התיקון כאן: הוספתי text-slate-900 באופן מפורש
              className="w-full p-3 text-sm text-slate-900 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none bg-slate-50 placeholder:text-slate-400"
              rows={3}
            />
            <button
              onClick={handleSubmit}
              disabled={state === "submitting"}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {state === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Feedback"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}