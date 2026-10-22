import { migrateFacts } from './facts/migration.js'

export function migrateDatabase(db) {
  const version = db.prepare('PRAGMA user_version').get().user_version
  if (version >= 5) return
  db.exec('BEGIN IMMEDIATE')
  try {
    if (version < 2) db.exec(`
      ALTER TABLE rules ADD COLUMN match_mode TEXT NOT NULL DEFAULT 'all'
        CHECK(match_mode IN ('all', 'any'));
      ALTER TABLE rules ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
      ALTER TABLE rules ADD COLUMN notes TEXT NOT NULL DEFAULT '';
      ALTER TABLE rules ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
      CREATE INDEX IF NOT EXISTS idx_rules_knowledge_base ON rules(knowledge_base_id);
    `)
    if (version < 3) db.exec(`
      ALTER TABLE rules ADD COLUMN import_key TEXT;
      ALTER TABLE rules ADD COLUMN provenance TEXT NOT NULL DEFAULT '{}'
        CHECK(json_valid(provenance));
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rule_import_key
        ON rules(knowledge_base_id, import_key) WHERE import_key IS NOT NULL;
    `)
    if (version < 4) migrateFacts(db)
    if (version < 5) db.exec(`
      ALTER TABLE inference_runs ADD COLUMN rule_snapshot TEXT NOT NULL DEFAULT '[]'
        CHECK(json_valid(rule_snapshot));
    `)
    db.exec('PRAGMA user_version = 5')
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
