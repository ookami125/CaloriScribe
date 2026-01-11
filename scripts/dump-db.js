#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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
    if (!key || process.env[key] !== undefined) {
      return;
    }
    const rawValue = rest.join("=").trim();
    const unquoted = rawValue.replace(/^\"|\"$/g, "").replace(/^'|'$/g, "");
    process.env[key] = unquoted;
  });
};

const showUsage = () => {
  console.log(
    [
      "Usage: node scripts/dump-db.js [outputPath] [--db <dbPath>] [--include-migrations]",
      "",
      "Defaults:",
      "  outputPath: ./db-dump-YYYY-MM-DD.json",
      "  dbPath: DATABASE_URL (file:...)",
    ].join("\n")
  );
};

const parseArgs = (argv) => {
  const args = { outputPath: "", dbPath: "", includeMigrations: false };
  const remaining = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--include-migrations") {
      args.includeMigrations = true;
      continue;
    }
    if (arg === "--db") {
      args.dbPath = argv[i + 1] || "";
      i += 1;
      continue;
    }
    remaining.push(arg);
  }
  if (remaining.length) {
    args.outputPath = remaining[0];
  }
  return args;
};

const toDateStamp = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resolveDatabasePath = (dbUrl, overridePath = "") => {
  if (overridePath) {
    return path.resolve(process.cwd(), overridePath);
  }
  if (!dbUrl) {
    return "";
  }
  if (!dbUrl.startsWith("file:")) {
    return "";
  }
  const withoutScheme = dbUrl.slice("file:".length);
  const [rawPath] = withoutScheme.split("?");
  if (!rawPath) {
    return "";
  }
  if (rawPath.startsWith("/")) {
    return rawPath;
  }
  return path.resolve(process.cwd(), rawPath);
};

const runSqliteJson = (dbPath, sql) => {
  const result = spawnSync("sqlite3", [dbPath], {
    input: `.mode json\n.headers on\n${sql}\n`,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const message = result.stderr?.trim() || "sqlite3 failed.";
    throw new Error(message);
  }
  const output = String(result.stdout || "").trim();
  if (!output) {
    return [];
  }
  return JSON.parse(output);
};

const ensureDirectory = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const main = () => {
  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db";
  }
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    showUsage();
    return;
  }

  const dbPath = resolveDatabasePath(process.env.DATABASE_URL, args.dbPath);
  if (!dbPath) {
    console.error("DATABASE_URL must be a file: path (SQLite) for this script.");
    process.exit(1);
  }
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found: ${dbPath}`);
    process.exit(1);
  }

  const outputPath =
    args.outputPath ||
    path.join(process.cwd(), `db-dump-${toDateStamp()}.json`);

  let tables = runSqliteJson(
    dbPath,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
  ).map((row) => row.name);

  if (!args.includeMigrations) {
    tables = tables.filter((name) => name !== "_prisma_migrations");
  }

  const data = {};
  tables.forEach((table) => {
    const rows = runSqliteJson(dbPath, `SELECT * FROM "${table}";`);
    data[table] = rows;
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    database: dbPath,
    tables,
    data,
  };

  ensureDirectory(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Database dumped to ${outputPath}.`);
};

main();
