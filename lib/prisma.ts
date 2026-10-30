import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { neonConfig } from "@neondatabase/serverless";
import { config } from "dotenv";
import { resolve } from "path";
import ws from "ws";

/**
 * Prisma Client Singleton for Neon PostgreSQL (Serverless)
 */

// Force load .env.local before anything else
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Configure WebSocket for Neon serverless (required in Node.js)
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Neon's serverless driver only speaks to Neon. Any other Postgres (local
 *  dev, CI) goes through node-postgres. */
export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL not found");
    return new PrismaClient();
  }

  try {
    const adapter = isNeonUrl(connectionString)
      ? new PrismaNeon({ connectionString })
      : new PrismaPg({ connectionString });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (error) {
    console.error("❌ Failed to create adapter:", error);
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
