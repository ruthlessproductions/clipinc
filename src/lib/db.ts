import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "storage");
const DB_PATH = path.join(DB_DIR, "clipinc.db");

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_url TEXT,
    file_name TEXT,
    file_path TEXT,
    duration REAL DEFAULT 0,
    processing_step TEXT DEFAULT 'uploading',
    processing_progress REAL DEFAULT 0,
    transcript TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clips (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time REAL NOT NULL,
    end_time REAL NOT NULL,
    duration REAL NOT NULL,
    aspect_ratio TEXT DEFAULT '9:16',
    status TEXT DEFAULT 'ready',
    score INTEGER DEFAULT 0,
    file_path TEXT,
    thumbnail_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS captions (
    id TEXT PRIMARY KEY,
    clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_time REAL NOT NULL,
    end_time REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS social_accounts (
    platform TEXT PRIMARY KEY,
    connected INTEGER DEFAULT 0,
    username TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TEXT
  );

  INSERT OR IGNORE INTO social_accounts (platform) VALUES ('tiktok'), ('youtube'), ('instagram'), ('twitter');
`);

export default db;

export function getProjects() {
  return db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
}

export function getProject(id: string) {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Record<string, unknown> | undefined;
}

export function createProject(data: {
  id: string;
  title: string;
  source_url?: string;
  file_name?: string;
  file_path?: string;
}) {
  db.prepare(
    "INSERT INTO projects (id, title, source_url, file_name, file_path) VALUES (?, ?, ?, ?, ?)"
  ).run(data.id, data.title, data.source_url ?? null, data.file_name ?? null, data.file_path ?? null);
}

export function updateProject(id: string, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE projects SET ${sets} WHERE id = ?`).run(
    ...keys.map((k) => data[k]),
    id
  );
}

export function getClips(projectId?: string) {
  if (projectId) {
    return db
      .prepare("SELECT * FROM clips WHERE project_id = ? ORDER BY score DESC")
      .all(projectId);
  }
  return db.prepare("SELECT * FROM clips ORDER BY created_at DESC").all();
}

export function getClip(id: string) {
  return db.prepare("SELECT * FROM clips WHERE id = ?").get(id) as Record<string, unknown> | undefined;
}

export function createClip(data: {
  id: string;
  project_id: string;
  title: string;
  description: string;
  start_time: number;
  end_time: number;
  duration: number;
  score: number;
}) {
  db.prepare(
    `INSERT INTO clips (id, project_id, title, description, start_time, end_time, duration, score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.id, data.project_id, data.title, data.description,
    data.start_time, data.end_time, data.duration, data.score
  );
}

export function updateClip(id: string, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE clips SET ${sets} WHERE id = ?`).run(
    ...keys.map((k) => data[k]),
    id
  );
}

export function getCaptions(clipId: string) {
  return db
    .prepare("SELECT * FROM captions WHERE clip_id = ? ORDER BY start_time")
    .all(clipId);
}

export function setCaptions(
  clipId: string,
  captions: { id: string; text: string; start_time: number; end_time: number }[]
) {
  const del = db.prepare("DELETE FROM captions WHERE clip_id = ?");
  const ins = db.prepare(
    "INSERT INTO captions (id, clip_id, text, start_time, end_time) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    del.run(clipId);
    for (const c of captions) {
      ins.run(c.id, clipId, c.text, c.start_time, c.end_time);
    }
  });
  tx();
}

export function getSocialAccounts() {
  return db.prepare("SELECT platform, connected, username FROM social_accounts").all();
}

export function updateSocialAccount(
  platform: string,
  data: { connected: number; username?: string; access_token?: string; refresh_token?: string; expires_at?: string }
) {
  db.prepare(
    `UPDATE social_accounts SET connected = ?, username = ?, access_token = ?, refresh_token = ?, expires_at = ? WHERE platform = ?`
  ).run(data.connected, data.username ?? null, data.access_token ?? null, data.refresh_token ?? null, data.expires_at ?? null, platform);
}
