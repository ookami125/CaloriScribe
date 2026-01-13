#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { hashPassword } = require("../lib/auth");
const { AuthDatabase } = require("../lib/auth-db");

const loadEnvFile = () => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const [key, ...rest] = trimmed.split("=");
    if (!key) {
      return;
    }
    if (process.env[key] !== undefined) {
      return;
    }
    const rawValue = rest.join("=").trim();
    const unquoted = rawValue.replace(/^\"|\"$/g, "").replace(/^'|'$/g, "");
    process.env[key] = unquoted;
  });
};

const showUsage = () => {
  console.log("Usage: node scripts/change-password.js <username> <password>");
};

const resolveSqlitePath = (url, fallbackPath) => {
  if (!url) {
    return fallbackPath;
  }
  if (!url.startsWith("file:")) {
    return fallbackPath;
  }
  const rawPath = url.slice("file:".length).split("?")[0];
  if (!rawPath) {
    return fallbackPath;
  }
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
};

const main = async () => {
  loadEnvFile();
  if (!process.env.AUTH_DATABASE_URL) {
    process.env.AUTH_DATABASE_URL = "file:./auth.db";
  }
  const args = process.argv.slice(2);
  const username = String(args[0] || "").trim().toLowerCase();
  const password = String(args[1] || "");
  if (!username || !password) {
    showUsage();
    process.exit(1);
  }

  const authDb = new AuthDatabase({
    filename: resolveSqlitePath(process.env.AUTH_DATABASE_URL, "auth.db"),
  });
  try {
    await authDb.open();
    await authDb.initSchema();
    const existing = await authDb.getUserByUsername(username);
    if (!existing) {
      console.error("User not found.");
      process.exit(1);
    }
    const passwordHash = await hashPassword(password);
    await authDb.updatePassword({ userId: existing.id, passwordHash });
    console.log(`Updated password for ${username}.`);
  } finally {
    await authDb.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
