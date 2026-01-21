"use strict";

const Database = require("better-sqlite3");

const AUTH_SCHEMA = `
CREATE TABLE IF NOT EXISTS "AuthUsers" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "username" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "external_id" TEXT NOT NULL UNIQUE,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuthSessions" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "token" TEXT NOT NULL UNIQUE,
  "user_id" INTEGER NOT NULL,
  "expires_at" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("user_id") REFERENCES "AuthUsers"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_auth_sessions_user" ON "AuthSessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_expires" ON "AuthSessions"("expires_at");
`;

const openSqlite = (filename) => new Database(filename);

const exec = (db, sql) => {
  db.exec(sql);
};

const run = (db, sql, params = []) => {
  const info = params.length ? db.prepare(sql).run(params) : db.prepare(sql).run();
  return { lastID: info.lastInsertRowid, changes: info.changes };
};

const get = (db, sql, params = []) =>
  params.length ? db.prepare(sql).get(params) : db.prepare(sql).get();

const all = (db, sql, params = []) =>
  params.length ? db.prepare(sql).all(params) : db.prepare(sql).all();

class AuthDatabase {
  constructor({ filename = ":memory:" } = {}) {
    this.filename = filename;
    this.db = null;
  }

  async open() {
    if (this.db) {
      return;
    }
    this.db = openSqlite(this.filename);
    this.db.pragma("foreign_keys = ON;");
  }

  async close() {
    if (!this.db) {
      return;
    }
    this.db.close();
    this.db = null;
  }

  async initSchema() {
    await exec(this.db, AUTH_SCHEMA);
  }

  async createUser({ username, passwordHash, externalId }) {
    const result = await run(
      this.db,
      `INSERT INTO "AuthUsers" ("username", "password_hash", "external_id")
       VALUES (?, ?, ?)`,
      [username, passwordHash, externalId]
    );
    return result.lastID;
  }

  async getUserByUsername(username) {
    return get(
      this.db,
      `SELECT * FROM "AuthUsers" WHERE "username" = ? LIMIT 1`,
      [username]
    );
  }

  async getUserById(id) {
    return get(
      this.db,
      `SELECT * FROM "AuthUsers" WHERE "id" = ? LIMIT 1`,
      [id]
    );
  }

  async getUserByExternalId(externalId) {
    return get(
      this.db,
      `SELECT * FROM "AuthUsers" WHERE "external_id" = ? LIMIT 1`,
      [externalId]
    );
  }

  async updatePassword({ userId, passwordHash }) {
    return run(
      this.db,
      `UPDATE "AuthUsers" SET "password_hash" = ?, "updated_at" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      [passwordHash, userId]
    );
  }

  async createSession({ userId, token, expiresAt }) {
    const result = await run(
      this.db,
      `INSERT INTO "AuthSessions" ("token", "user_id", "expires_at")
       VALUES (?, ?, ?)`,
      [token, userId, expiresAt]
    );
    return result.lastID;
  }

  async getSessionByToken(token) {
    return get(
      this.db,
      `SELECT * FROM "AuthSessions" WHERE "token" = ? LIMIT 1`,
      [token]
    );
  }

  async deleteSession(token) {
    return run(
      this.db,
      `DELETE FROM "AuthSessions" WHERE "token" = ?`,
      [token]
    );
  }

  async deleteExpiredSessions(nowIso) {
    return run(
      this.db,
      `DELETE FROM "AuthSessions" WHERE "expires_at" <= ?`,
      [nowIso]
    );
  }

  async listUsers() {
    return all(this.db, `SELECT * FROM "AuthUsers" ORDER BY "id" ASC`);
  }
}

module.exports = { AuthDatabase };
