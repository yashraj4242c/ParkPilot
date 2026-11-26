import { execSync, spawn } from "node:child_process";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = 5433;
const DB_NAME = "parkpilot";
const DB_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/${DB_NAME}?schema=public`;
const DATA_DIR = path.resolve(process.cwd(), ".local-pg");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
  });

  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(DB_NAME);
  } catch {
    // Database already exists
  }

  console.log(`Database started on ${DB_URL}`);

  const env = {
    ...process.env,
    DATABASE_URL: DB_URL,
    DIRECT_URL: DB_URL,
    NODE_ENV: "development",
    PORT: "3001",
    APP_URL: "http://localhost:5173",
    JWT_SECRET: "parkpilot-local-dev-jwt-secret-at-least-32-chars",
    ADMIN_EMAIL: "admin@parkpilot.local",
    ADMIN_PASSWORD: "ChangeMeAdmin123!",
    ADMIN_NAME: "ParkPilot Admin",
    ENABLE_DEV_PAYMENT_MODE: "true",
  };

  try {
    console.log("Running migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit", env });
    console.log("Running seed...");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
  } catch (err) {
    console.error("Migration/seed error:", err);
  }

  console.log("Starting Express backend and Vite frontend...");

  const apiProc = spawn("npx", ["tsx", "server/dev.ts"], {
    stdio: "inherit",
    shell: true,
    env,
  });

  const webProc = spawn("npx", ["vite", "--host", "0.0.0.0", "--port", "5173"], {
    stdio: "inherit",
    shell: true,
    env,
  });

  const shutdown = async () => {
    console.log("Shutting down processes...");
    apiProc.kill();
    webProc.kill();
    await pg.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
