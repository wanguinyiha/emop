import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { pool } from "./db";

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. A table that remembers which migration files already ran
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 2. Read which ones are done
    const done = await client.query("SELECT filename FROM schema_migrations");
    const applied = new Set(done.rows.map((row) => row.filename));

    // 3. Read all .sql files, in order of their names
    const dir = path.join(process.cwd(), "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // 4. Run each new file inside a transaction
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied ${file}`);
        count++;
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Failed on ${file}. Nothing from this file was saved.`);
        throw error;
      }
    }

    console.log(count === 0 ? "Nothing to apply. Database is up to date." : `Done. ${count} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
