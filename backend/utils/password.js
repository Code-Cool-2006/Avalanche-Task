
import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

const OPTIONS = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

// Hash password using a unique, random 16-byte salt
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);

  const derivedKey = await scrypt(
    password,
    salt,
    64,
    OPTIONS
  );

  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

// Verify password against the stored salt and hash
export async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split(":");

    if (
      parts.length !== 2 ||
      !/^[0-9a-f]{32}$/i.test(parts[0]) ||
      !/^[0-9a-f]{128}$/i.test(parts[1])
    ) {
      return false;
    }

    const salt = Buffer.from(parts[0], "hex");
    const expected = Buffer.from(parts[1], "hex");

    const actual = await scrypt(
      password,
      salt,
      64,
      OPTIONS
    );

    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}