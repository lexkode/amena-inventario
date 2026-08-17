import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { extname, join } from "node:path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function sanitizeExtension(rawName: string): string {
  const ext = extname(rawName).toLowerCase();
  if (ext && ext.length <= 6 && /^[\.a-z0-9]+$/.test(ext)) return ext;
  return ".png";
}

function buildFilename(extension: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rnd}${extension.startsWith(".") ? extension : "." + extension}`;
}

/** Guarda el archivo en public/uploads y devuelve la URL pública. */
export async function saveUpload(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = sanitizeExtension(file.name);
  const filename = buildFilename(ext);
  const filepath = join(UPLOAD_DIR, filename);

  const nodeStream = Readable.fromWeb(file.stream() as any);
  const writeStream = createWriteStream(filepath);
  await pipeline(nodeStream, writeStream);

  return `/uploads/${filename}`;
}