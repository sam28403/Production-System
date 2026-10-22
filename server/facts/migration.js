export function migrateFacts(db) {
  db.exec(`
    ALTER TABLE facts ADD COLUMN field_key TEXT;
    ALTER TABLE facts ADD COLUMN value_json TEXT CHECK(value_json IS NULL OR json_valid(value_json));
    ALTER TABLE facts ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE facts ADD COLUMN notes TEXT NOT NULL DEFAULT '';
    ALTER TABLE facts ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
    ALTER TABLE facts ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
    CREATE UNIQUE INDEX idx_fact_field_value
      ON facts(knowledge_base_id, field_key, value_json) WHERE field_key IS NOT NULL;
  `)
}
