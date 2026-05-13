"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Database, Zap } from "lucide-react";

export default function DebugPage() {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [loadingDbInfo, setLoadingDbInfo] = useState(false);

  const testDatabaseConnection = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("🧪 Testing database connection...");
      const response = await fetch('/api/debug-add-credits', {
        method: 'GET',
        cache: 'no-store'
      });

      const data = await response.json();
      console.log("🧪 API Response:", data);
      
      setResult({
        status: response.status,
        statusText: response.ok ? "SUCCESS" : "FAILED",
        data: data
      });
    } catch (error: any) {
      console.error("🧪 Fetch error:", error);
      setResult({
        status: 0,
        statusText: "NETWORK ERROR",
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseInfo = async () => {
    setLoadingDbInfo(true);
    setDbInfo(null);

    try {
      console.log("🔍 Checking database info...");
      const response = await fetch('/api/debug-db-info', {
        method: 'GET',
        cache: 'no-store'
      });

      const data = await response.json();
      console.log("🔍 DB Info Response:", data);
      setDbInfo(data);
    } catch (error: any) {
      console.error("🔍 Fetch error:", error);
      setDbInfo({ error: error.message });
    } finally {
      setLoadingDbInfo(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Database Connection Debug Tool
          </h1>
          <p className="text-black">
            This page tests database connectivity and credit operations directly, bypassing checkout.
          </p>
        </div>

        {/* Auth Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Clerk Loaded:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${isLoaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isLoaded ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Logged In:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${userId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {userId ? "Yes" : "No"}
              </span>
            </div>
            {userId && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">User ID:</span>
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{userId}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="text-gray-900">{user?.emailAddresses[0]?.emailAddress || "N/A"}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Information</h2>
          <p className="text-black mb-4">
            Check which database is being used and verify your user data exists.
          </p>
          
          <button
            onClick={checkDatabaseInfo}
            disabled={!userId || loadingDbInfo}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white
              flex items-center justify-center gap-2 transition-all mb-4
              ${!userId || loadingDbInfo 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
              }
            `}
          >
            {loadingDbInfo ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Check Database Info
              </>
            )}
          </button>

          {dbInfo && (
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <pre className="text-sm font-mono text-black whitespace-pre-wrap">
                {JSON.stringify(dbInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Test Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Database Operation</h2>
          <p className="text-black mb-4">
            Click the button below to test adding 5 credits to your account. This will:
          </p>
          <ul className="list-disc list-inside text-black space-y-1 mb-6">
            <li>Verify authentication</li>
            <li>Check if your user exists in the database</li>
            <li>Attempt to increment your credits by 5</li>
            <li>Return detailed error information if anything fails</li>
          </ul>
          
          <button
            onClick={testDatabaseConnection}
            disabled={!userId || loading}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white
              flex items-center justify-center gap-2 transition-all
              ${!userId || loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Add 5 Credits (Test)
              </>
            )}
          </button>
          
          {!userId && (
            <p className="mt-4 text-sm text-red-600">
              ⚠️ You must be logged in to test database operations
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            
            {/* Status Badge */}
            <div className="mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                result.status === 200 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.statusText} (HTTP {result.status})
              </span>
            </div>

            {/* Response Data */}
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <pre className="text-sm font-mono text-black whitespace-pre-wrap">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>

            {/* Success Message */}
            {result.status === 200 && result.data.success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-black font-medium">
                  ✅ Database operation successful!
                </p>
                <p className="text-black text-sm mt-1">
                  Credits updated: {result.data.oldBalance} → {result.data.newBalance} (+{result.data.added})
                </p>
              </div>
            )}

            {/* Error Message */}
            {result.status !== 200 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-black font-medium">
                  ❌ Database operation failed
                </p>
                <p className="text-black text-sm mt-1">
                  {result.data.error || "Unknown error"}
                </p>
                {result.data.suggestion && (
                  <p className="text-black text-sm mt-2">
                    💡 Suggestion: {result.data.suggestion}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Console Reminder */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-black text-sm">
            💡 <strong>Tip:</strong> Open your browser's Developer Console (F12) to see detailed logs during the test.
          </p>
        </div>
      </div>
    </div>
  );
}
