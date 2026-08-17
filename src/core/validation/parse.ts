import type { ZodType } from "zod";

export function parse<T>(value: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const message =
      result.error.issues[0]?.message ?? "Datos inválidos";
    throw new Error(message);
  }
  return result.data;
}

export function formToObject(form: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    const values = form.getAll(key);
    obj[key] = values.length === 1 ? values[0] : values;
  }
  return obj;
}