import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { migrateDatabase } from './migrations.js'

export const databasePath = fileURLToPath(new URL('../data/production.sqlite', import.meta.url))

export function openDatabase(path = databasePath) {
  if (path === databasePath) {
    mkdirSync(fileURLToPath(new URL('../data/', import.meta.url)), { recursive: true })
  }
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 40),
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_base_id INTEGER NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      UNIQUE(knowledge_base_id, name)
    );
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_base_id INTEGER NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      conditions TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(conditions)),
      conclusion TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS inference_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_base_id INTEGER NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      initial_facts TEXT NOT NULL CHECK(json_valid(initial_facts)),
      trace TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(trace)),
      conclusions TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(conclusions)),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)
  migrateDatabase(db)
  return db
}
