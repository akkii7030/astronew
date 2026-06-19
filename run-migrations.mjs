// run-migrations.mjs
// Pushes all migrations to the Supabase project using the Management API + service_role JWT.
// Run with: node run-migrations.mjs
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF    = "ptuzewebbzvxlibtrvth";
const SERVICE_ROLE   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXpld2ViYnp2eGxpYnRydnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYzNTcyOCwiZXhwIjoyMDk2MjExNzI4fQ.m86Y05MwNRApIid1Aem2YDMW2eY7XHVg2j7oVsdGnGk";
const SUPABASE_URL   = `https://${PROJECT_REF}.supabase.co`;

async function runSQL(query) {
  // Supabase exposes a SQL-over-REST endpoint via PostgREST's raw query mode
  // available to the service_role key via the /rest/v1/rpc/query path.
  // Fallback: use the Supabase Management API directly.
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ query }),
    }
  );

  if (mgmtRes.ok) return await mgmtRes.json();

  const mgmtErr = await mgmtRes.text();
  throw new Error(`Management API failed (${mgmtRes.status}): ${mgmtErr}`);
}

// Read & sort migrations
const migrationsDir = join(__dirname, "supabase", "migrations");
const files = readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

console.log(`\n📦 Applying ${files.length} migration(s) to ${PROJECT_REF}:\n`);
files.forEach(f => console.log(`  • ${f}`));
console.log("");

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8").trim();
  if (!sql) { console.log(`⏭  Skipped (empty): ${file}`); continue; }
  process.stdout.write(`▶  ${file} ... `);
  try {
    await runSQL(sql);
    console.log("✅");
  } catch (err) {
    console.log(`❌\n   ${err.message}`);
    process.exit(1);
  }
}

console.log("\n🎉 All migrations applied! Your Supabase project is ready.\n");
