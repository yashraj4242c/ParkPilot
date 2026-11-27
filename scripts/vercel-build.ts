import { execSync } from "node:child_process";

console.log("==> [ParkPilot Build] Generating Prisma client...");
execSync("npx prisma generate", { stdio: "inherit" });

const dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost")) {
  console.log("==> [ParkPilot Build] Cloud DATABASE_URL detected. Applying database migrations...");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("==> [ParkPilot Build] Database migrations applied successfully!");

    try {
      console.log("==> [ParkPilot Build] Seeding initial admin and sample listings...");
      execSync("npx tsx prisma/seed.ts", {
        stdio: "inherit",
        env: {
          ...process.env,
          SEED_SAMPLE_DATA: process.env.SEED_SAMPLE_DATA || "true",
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@parkpilot.local",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "ChangeMeAdmin123!",
        },
      });
      console.log("==> [ParkPilot Build] Initial database seeding completed!");
    } catch (seedErr) {
      console.warn("==> [ParkPilot Build] Seed step notice:", seedErr);
    }
  } catch (migErr) {
    console.warn(
      "==> [ParkPilot Build] Could not run migrate deploy during build:",
      migErr
    );
  }
} else {
  console.log(
    "==> [ParkPilot Build] Notice: Local or unset DATABASE_URL during build. Skipping remote migrations."
  );
}

console.log("==> [ParkPilot Build] Compiling Vite production assets...");
execSync("npx vite build", { stdio: "inherit" });
console.log("==> [ParkPilot Build] Build complete!");
