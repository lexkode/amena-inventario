export type BrandToken = {
  key: string;
  label: string;
  group: string;
  default: string;
};

/**
 * Tokens de color editables desde /admin/marca. `key` es el nombre de la
 * variable CSS sin el prefijo `--` (se inyecta como `--<key>`).
 */
export const BRAND_TOKENS: BrandToken[] = [
  { key: "c-accent", label: "Acento", group: "Marca", default: "#dc832f" },
  { key: "c-accent-hover", label: "Acento (hover)", group: "Marca", default: "#b8681d" },

  { key: "c-text", label: "Texto", group: "Texto", default: "#244858" },
  { key: "c-text-muted", label: "Texto suave", group: "Texto", default: "#5a7682" },

  { key: "c-bg", label: "Fondo", group: "Superficies", default: "#b6c6c3" },
  { key: "c-bg-light", label: "Fondo claro", group: "Superficies", default: "#c0cfcc" },
  { key: "c-bg-dark", label: "Fondo oscuro", group: "Superficies", default: "#244858" },
  { key: "c-surface", label: "Tarjeta", group: "Superficies", default: "#ffffff" },
  { key: "c-surface-muted", label: "Tarjeta suave", group: "Superficies", default: "#eef3f1" },
  { key: "c-line", label: "Bordes", group: "Superficies", default: "#c0cfcc" },
  { key: "c-white", label: "Blanco", group: "Superficies", default: "#ffffff" },

  { key: "c-danger", label: "Peligro", group: "Acentos", default: "#b91c1c" },
  { key: "c-success", label: "Éxito", group: "Acentos", default: "#16a34a" },

  { key: "c-disponible", label: "Disponible", group: "Estados de lotes", default: "#16a34a" },
  { key: "c-reservado", label: "Reservado", group: "Estados de lotes", default: "#dc832f" },
  { key: "c-vendido", label: "Vendido", group: "Estados de lotes", default: "#dc2626" },
  { key: "c-disponible-bg", label: "Disponible (fondo)", group: "Estados de lotes", default: "#dcfce7" },
  { key: "c-disponible-fg", label: "Disponible (texto)", group: "Estados de lotes", default: "#166534" },
  { key: "c-reservado-bg", label: "Reservado (fondo)", group: "Estados de lotes", default: "#fef9c3" },
  { key: "c-reservado-fg", label: "Reservado (texto)", group: "Estados de lotes", default: "#854d0e" },
  { key: "c-vendido-bg", label: "Vendido (fondo)", group: "Estados de lotes", default: "#fee2e2" },
  { key: "c-vendido-fg", label: "Vendido (texto)", group: "Estados de lotes", default: "#991b1b" },
];

export const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export type BrandFont = {
  value: string;
  label: string;
  serif?: boolean;
};

/**
 * Fuentes disponibles desde /admin/marca. `value` es el nombre en Google Fonts
 * (vacío = pila del sistema). Las que tengan valor se cargan dinámicamente.
 */
export const BRAND_FONTS: BrandFont[] = [
  { value: "", label: "Predeterminada (sistema)" },
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Raleway", label: "Raleway" },
  { value: "Nunito", label: "Nunito" },
  { value: "Manrope", label: "Manrope" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Work Sans", label: "Work Sans" },
  { value: "Source Sans 3", label: "Source Sans 3" },
  { value: "Playfair Display", label: "Playfair Display", serif: true },
  { value: "Merriweather", label: "Merriweather", serif: true },
  { value: "Lora", label: "Lora", serif: true },
];

export type MarcaConfig = {
  colores: Record<string, string>;
  logoFrontPath: string | null;
  logoAdminPath: string | null;
  logoAdminColapsadoPath: string | null;
  tipografia: string | null;
};
