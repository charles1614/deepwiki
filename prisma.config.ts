import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load environment variables from both .env and .env.local
config({ path: ".env" });
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
