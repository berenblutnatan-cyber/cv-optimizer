// Prisma configuration file
// Loads DATABASE_URL from .env.local (Next.js convention)
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for Next.js projects
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
