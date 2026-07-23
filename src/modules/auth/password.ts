import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;
const SALT_LEN = 16;
const N = 16384;
const r = 8;
const p = 1;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN, { N, r, p }).toString("hex");
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const costN = Number(parts[1]);
  const costR = Number(parts[2]);
  const costP = Number(parts[3]);
  const salt = parts[4];
  const expectedHex = parts[5];
  if (!salt || !expectedHex) return false;
  if (!Number.isFinite(costN) || !Number.isFinite(costR) || !Number.isFinite(costP)) {
    return false;
  }
  const actual = scryptSync(password, salt, KEY_LEN, {
    N: costN,
    r: costR,
    p: costP,
  });
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
