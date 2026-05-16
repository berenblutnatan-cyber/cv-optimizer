"use client";

import { useState } from "react";
import { Gift, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CouponRedeem() {
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setMessage({ type: "error", text: "Please enter a coupon code" });
      return;
    }

    setIsRedeeming(true);
    setMessage(null);

    try {
      const response = await fetch("/api/redeem-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Coupon Redeemed!", {
          description: `${data.message} You now have ${data.totalCredits} credits!`,
        });
        setCode(""); // Clear input on success
        setMessage(null); // Clear message state
      } else {
        toast.error("Invalid Coupon", {
          description: data.error || "Failed to redeem coupon. Please try again.",
        });
        setMessage({
          type: "error",
          text: data.error || "Failed to redeem coupon. Please try again.",
        });
      }
    } catch (error) {
      console.error("Coupon redeem error:", error);
      toast.error("Error", {
        description: "An error occurred. Please try again.",
      });
      setMessage({
        type: "error",
        text: "An error occurred. Please try again.",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-sm shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] p-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
          <Gift className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
        </div>
        <h3 className="font-serif text-lg text-[#1a1a1a]">Redeem Promo Code</h3>
      </div>
      
      <form onSubmit={handleRedeem} className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setMessage(null); // Clear message when typing
            }}
            placeholder="Enter promo code (e.g., LAUNCH2024)"
            className="flex-1 px-4 py-2.5 border border-stone-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] text-base sm:text-sm font-light text-[#1a1a1a] placeholder:text-stone-500"
            disabled={isRedeeming}
          />
          <button
            type="submit"
            disabled={isRedeeming || !code.trim()}
            className="px-6 py-2.5 bg-[#0A2647] hover:bg-[#0d3259] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-medium rounded-sm transition-colors flex items-center gap-2 tracking-wide"
          >
            {isRedeeming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                Applying...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" strokeWidth={1.5} />
                Apply
              </>
            )}
          </button>
        </div>

        {message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-sm text-sm font-light ${
              message.type === "success"
                ? "bg-[#0A2647]/5 text-[#0A2647] border border-[#0A2647]/20"
                : "bg-red-50/80 text-red-700 border border-red-200/60"
            }`}
          >
            {message.type === "success" ? (
              <Check className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            ) : (
              <X className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </form>

      <p className="text-xs text-stone-500 font-light">
        Have a promo code? Enter it above to get free credits!
      </p>
    </div>
  );
}
