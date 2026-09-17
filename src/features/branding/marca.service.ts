import { desc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import { marca as marcaTable } from "@core/db/schema";
import { BRAND_FONTS, BRAND_TOKENS, type MarcaConfig } from "./marca.types";

const DEFAULT_CONFIG: MarcaConfig = {
  colores: {},
  logoFrontPath: null,
  logoAdminPath: null,
  logoAdminColapsadoPath: null,
  tipografia: null,
};

const TOKEN_KEYS = new Set(BRAND_TOKENS.map((t) => t.key));
const FONT_VALUES = new Set(BRAND_FONTS.map((f) => f.value));

function parseColores(json: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (TOKEN_KEYS.has(key) && typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Devuelve la configuración de marca vigente (fila más reciente) o los defaults. */
export async function getMarca(): Promise<MarcaConfig> {
  try {
    const row = (
      await db
        .select()
        .from(marcaTable)
        .orderBy(desc(marcaTable.createdAt))
        .limit(1)
    )[0];
    if (!row) return { ...DEFAULT_CONFIG, colores: {} };
    return {
      colores: parseColores(row.coloresJson),
      logoFrontPath: row.logoFrontPath,
      logoAdminPath: row.logoAdminPath,
      logoAdminColapsadoPath: row.logoAdminColapsadoPath,
      tipografia: row.tipografia,
    };
  } catch {
    return { ...DEFAULT_CONFIG, colores: {} };
  }
}

export async function upsertMarca(input: MarcaConfig): Promise<void> {
  const coloresJson = JSON.stringify(input.colores);
  const current = (
    await db
      .select({ id: marcaTable.id })
      .from(marcaTable)
      .orderBy(desc(marcaTable.createdAt))
      .limit(1)
  )[0];

  const values = {
    coloresJson,
    logoFrontPath: input.logoFrontPath,
    logoAdminPath: input.logoAdminPath,
    logoAdminColapsadoPath: input.logoAdminColapsadoPath,
    tipografia: input.tipografia,
  };

  if (current) {
    await db.update(marcaTable).set(values).where(eq(marcaTable.id, current.id));
    return;
  }
  await db.insert(marcaTable).values(values);
}

/** Mezcla los overrides guardados con los valores por defecto de cada token. */
export function coloresEfectivos(colores: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const token of BRAND_TOKENS) out[token.key] = colores[token.key] ?? token.default;
  return out;
}

/** Pila CSS para la tipografía elegida (o null si es la del sistema). */
export function brandFontStack(tipografia: string | null): string | null {
  if (!tipografia) return null;
  const font = BRAND_FONTS.find((f) => f.value === tipografia);
  if (!font || !font.value) return null;
  const fallback = font.serif ? "Georgia, serif" : "system-ui, sans-serif";
  return `'${font.value}', ${fallback}`;
}

/** URL de Google Fonts para la tipografía elegida (o null si no aplica). */
export function brandFontHref(tipografia: string | null): string | null {
  if (!tipografia) return null;
  const font = BRAND_FONTS.find((f) => f.value === tipografia);
  if (!font || !font.value) return null;
  const family = font.value.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
}

/** Genera el bloque CSS que sobreescribe los tokens en `:root`. */
export function buildMarcaCss(marca: MarcaConfig): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(marca.colores)) {
    if (TOKEN_KEYS.has(key) && value) parts.push(`--${key}:${value};`);
  }
  const stack = brandFontStack(marca.tipografia);
  if (stack) parts.push(`--font-sans:${stack};`);
  return parts.length ? `:root:root{${parts.join("")}}` : "";
}

/** Valida que la tipografía esté dentro de las permitidas. */
export function normalizeTipografia(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return FONT_VALUES.has(value) && value ? value : null;
}
