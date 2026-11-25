import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or API Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  "artists",
  "albums",
  "songs",
  "playlists",
  "playlist_songs",
  "favourites",
  "play_history",
  "profiles",
  "invites",
  "waitlist"
];

async function fetchAllRows(table) {
  let allRows = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, to);

    if (error) {
      // Table might not exist or permission denied
      console.warn(`⚠️ Warning fetching table "${table}": ${error.message}`);
      return allRows;
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);

    if (data.length < pageSize) break;
    page++;
  }

  return allRows;
}

async function runExport() {
  console.log(`🚀 Starting database export from: ${supabaseUrl}`);
  const backup = {
    exportedAt: new Date().toISOString(),
    supabaseUrl,
    tables: {}
  };

  for (const table of TABLES) {
    process.stdout.write(`Exporting "${table}"... `);
    const rows = await fetchAllRows(table);
    backup.tables[table] = rows;
    console.log(`✅ ${rows.length} rows`);
  }

  // Export auth users if service role key is present
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      console.log(`Exporting auth.users...`);
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (!error && users) {
        backup.authUsers = users.map(u => ({
          id: u.id,
          email: u.email,
          user_metadata: u.user_metadata,
          app_metadata: u.app_metadata,
          created_at: u.created_at
        }));
        console.log(`✅ ${backup.authUsers.length} auth users exported`);
      }
    } catch (e) {
      console.warn(`⚠️ Could not export auth.users: ${e.message}`);
    }
  } else {
    console.log(`ℹ️ Tip: Add SUPABASE_SERVICE_ROLE_KEY to .env.local to also export auth users.`);
  }

  const outputPath = path.resolve(process.cwd(), "orbit-database-backup.json");
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf-8");

  const stats = fs.statSync(outputPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n🎉 Backup complete!`);
  console.log(`📁 File saved to: ${outputPath} (${sizeMb} MB)`);
}

runExport().catch(err => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});
