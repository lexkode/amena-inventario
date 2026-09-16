import { extname } from "node:path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
  R2_SECRET_ACCESS_KEY,
} from "astro:env/server";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

type StorageConfig = {
  client: S3Client;
  bucket: string;
  publicBaseUrl: string;
};

let cached: StorageConfig | null = null;

function getStorage(): StorageConfig {
  if (cached) return cached;

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET ||
    !R2_PUBLIC_BASE_URL
  ) {
    throw new Error(
      "R2 no está configurado: define R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET y R2_PUBLIC_BASE_URL",
    );
  }

  cached = {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    }),
    bucket: R2_BUCKET,
    publicBaseUrl: R2_PUBLIC_BASE_URL.replace(/\/+$/, ""),
  };
  return cached;
}

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

/** Sube el archivo a R2 y devuelve su URL pública. */
export async function saveUpload(file: File): Promise<string> {
  const { client, bucket, publicBaseUrl } = getStorage();
  const key = buildFilename(sanitizeExtension(file.name));
  const body = new Uint8Array(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return `${publicBaseUrl}/${key}`;
}

/** Elimina el objeto de R2 a partir de su URL pública. */
export async function deleteUpload(publicUrl: string): Promise<void> {
  let storage: StorageConfig;
  try {
    storage = getStorage();
  } catch {
    return;
  }

  const prefix = `${storage.publicBaseUrl}/`;
  if (!publicUrl.startsWith(prefix)) return;
  const key = publicUrl.slice(prefix.length);
  if (!key) return;

  try {
    await storage.client.send(
      new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
  } catch {
    /* el archivo puede no existir; no bloquear */
  }
}
