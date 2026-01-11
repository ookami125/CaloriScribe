#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../lib/auth");

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
  console.log("Usage: node scripts/create-user.js <username> <password>");
};

const main = async () => {
  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db";
  }
  const args = process.argv.slice(2);
  const username = String(args[0] || "").trim().toLowerCase();
  const password = String(args[1] || "");
  if (!username || !password) {
    showUsage();
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.error("User already exists.");
      process.exit(1);
    }
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        username,
        passwordHash,
      },
    });
    console.log(`Created user ${username}.`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
