import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { pool } from "./db";

async function seed() {
  const argument = process.argv[2];
  if (!argument) {
    throw new Error("Usage: npm run seed -- <file name inside the seeds folder>");
  }

  // basename keeps the name to a plain file name, so nobody can point outside the seeds folder
  const fileName = path.basename(argument);
  const sql = fs.readFileSync(path.join(process.cwd(), "seeds", fileName), "utf8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`Seeded ${fileName}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Failed on ${fileName}. Nothing from this file was saved.`);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
