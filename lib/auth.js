"use strict";

const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const verifyPassword = async (password, storedHash) => {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) {
    return false;
  }
  const derivedKey = await scrypt(password, salt, 64);
  const hashedBuffer = Buffer.from(hash, "hex");
  if (hashedBuffer.length !== derivedKey.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashedBuffer, derivedKey);
};

module.exports = { hashPassword, verifyPassword };
