import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
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

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  
  console.log("🔧 Prisma init - CWD:", process.cwd());
  console.log("🔧 Prisma init - DATABASE_URL exists:", !!connectionString);
  console.log("🔧 Prisma init - URL preview:", connectionString?.substring(0, 30) + "...");
  
  if (!connectionString) {
    console.error("❌ DATABASE_URL not found");
    return new PrismaClient();
  }

  try {
    // Create Neon pool with explicit connection string
    const pool = new Pool({ 
      connectionString: connectionString,
    });
    
    const adapter = new PrismaNeon(pool);
    
    console.log("✅ Prisma + Neon adapter initialized");
    
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
