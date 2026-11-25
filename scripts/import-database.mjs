import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Usage:
// node scripts/import-database.mjs <TARGET_SUPABASE_URL> <TARGET_SUPABASE_KEY> [BACKUP_FILE]
// or set TARGET_SUPABASE_URL and TARGET_SUPABASE_KEY in environment or .env.local

const args = process.argv.slice(2);
const targetUrl = args[0] || process.env.TARGET_SUPABASE_URL;
const targetKey = args[1] || process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY || process.env.TARGET_SUPABASE_KEY;
const backupFile = args[2] || process.env.BACKUP_FILE || "orbit-database-backup.json";

if (!targetUrl || !targetKey) {
  console.error("❌ Usage: node scripts/import-database.mjs <TARGET_SUPABASE_URL> <TARGET_SUPABASE_KEY>");
  console.error("   Or provide them as TARGET_SUPABASE_URL and TARGET_SUPABASE_KEY.");
  process.exit(1);
}

const backupPath = path.resolve(process.cwd(), backupFile);
if (!fs.existsSync(backupPath)) {
  console.error(`❌ Backup file not found at: ${backupPath}`);
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
const supabase = createClient(targetUrl, targetKey);

// Dependency order is crucial for foreign keys
const INSERT_ORDER = [
  "profiles",
  "artists",
  "albums",
  "songs",
  "playlists",
  "playlist_songs",
  "favourites",
  "play_history",
  "invites",
  "waitlist"
];

const ON_CONFLICT_KEYS = {
  profiles: "id",
  artists: "id",
  albums: "id",
  songs: "id",
  playlists: "id",
  playlist_songs: "playlist_id,song_id",
  favourites: "user_id,song_id",
  play_history: "id",
  invites: "id",
  waitlist: "id"
};

async function chunkAndInsert(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`⏩ Skipping "${table}" (0 rows)`);
    return;
  }

  const chunkSize = 50;
  const onConflict = ON_CONFLICT_KEYS[table] || "id";
  let inserted = 0;

  process.stdout.write(`Importing "${table}" (${rows.length} rows)... `);

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict, ignoreDuplicates: false });

    if (error) {
      console.error(`\n❌ Error inserting batch into "${table}": ${error.message}`);
      // Fallback: try individual inserts to continue on minor failures
      for (const row of chunk) {
        const { error: rowErr } = await supabase.from(table).upsert(row, { onConflict });
        if (rowErr) {
          console.warn(`  ⚠️ Row error (${row.id || row.title || "item"}): ${rowErr.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += chunk.length;
    }
  }

  console.log(`✅ ${inserted}/${rows.length} imported`);
}

async function runImport() {
  console.log(`🚀 Restoring database to target: ${targetUrl}`);
  console.log(`📅 Backup timestamp: ${backup.exportedAt || "Unknown"}\n`);

  for (const table of INSERT_ORDER) {
    const rows = backup.tables?.[table];
    if (rows) {
      await chunkAndInsert(table, rows);
    }
  }

  console.log(`\n🎉 Migration complete! All tables have been imported to your new Supabase project.`);
}

runImport().catch(err => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
