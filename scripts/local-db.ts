import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import path from "path";

const PORT = 5433;
const DB_NAME = "parkpilot";
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
    console.log(`Created database '${DB_NAME}'.`);
  } catch {
    // Database already exists when reusing persistent .local-pg directory
  }

  console.log(
    `Local PostgreSQL running on postgresql://postgres:postgres@127.0.0.1:${PORT}/${DB_NAME}`
  );

  const shutdown = async () => {
    console.log("Stopping local PostgreSQL...");
    await pg.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start local PostgreSQL:", err);
  process.exit(1);
});
