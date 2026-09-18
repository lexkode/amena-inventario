import { extname } from "node:path";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
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

/** Sube un JSON a R2 (con descarga forzada) y devuelve su URL pública. */
export async function saveJsonBackup(
  data: unknown,
  filename: string,
): Promise<string> {
  const { client, bucket, publicBaseUrl } = getStorage();
  const safe =
    filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "respaldo.json";
  const key = `backups/${Date.now().toString(36)}-${safe}`;
  const body = new TextEncoder().encode(JSON.stringify(data));

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      ContentDisposition: `attachment; filename="${safe}"`,
    }),
  );

  return `${publicBaseUrl}/${key}`;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;

export type UploadObject = {
  url: string;
  key: string;
  createdAt: number;
  size: number;
};

/** Lista las imágenes subidas a R2 (excluye backups/), más recientes primero. */
export async function listUploads(): Promise<UploadObject[]> {
  const { client, bucket, publicBaseUrl } = getStorage();
  const out: UploadObject[] = [];
  let token: string | undefined;
  let pages = 0;

  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 }),
    );
    for (const o of res.Contents ?? []) {
      if (!o.Key || o.Key.startsWith("backups/") || !IMAGE_EXT.test(o.Key)) continue;
      out.push({
        url: `${publicBaseUrl}/${o.Key}`,
        key: o.Key,
        createdAt: o.LastModified ? o.LastModified.getTime() : 0,
        size: o.Size ?? 0,
      });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
    pages += 1;
  } while (token && pages < 20);

  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** Indica si una URL corresponde a un archivo gestionado en el bucket R2. */
export function isManagedUploadUrl(url: string): boolean {
  try {
    const { publicBaseUrl } = getStorage();
    return url.startsWith(`${publicBaseUrl}/`);
  } catch {
    return false;
  }
}

export type BackupObject = { url: string; createdAt: number };

/** Lista los respaldos JSON guardados en R2 (prefijo backups/). */
export async function listJsonBackups(prefix = "backups/"): Promise<BackupObject[]> {
  const { client, bucket, publicBaseUrl } = getStorage();
  const out = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
  );
  return (out.Contents ?? [])
    .filter((o) => o.Key && o.Key.endsWith(".json"))
    .map((o) => ({
      url: `${publicBaseUrl}/${o.Key}`,
      createdAt: o.LastModified ? o.LastModified.getTime() : Date.now(),
    }));
}
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
