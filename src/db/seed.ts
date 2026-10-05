import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "../features/auth/password.service";
import { modelos, users, type NewModelo } from "./schema";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const AMENA_MODELOS: NewModelo[] = [
  {
    nombre: "Casa Calma",
    tipo: "casa",
    precioBase: 94850,
    terrenoM2: 105,
    construccionM2: 73,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    dimensionesLote: "15m x 7m",
    caracteristicasJson: JSON.stringify([
      "1 Parqueo",
      "Jardín Frontal",
      "Jardín Trasero",
      "Sala",
      "Área de Lavado",
      "Cocina-Comedor",
      "Cuarto Principal",
      "1 Cuarto Jr.",
      "1 Baño Compartido",
      "1 Baño Privado",
    ]),
    orden: 0,
  },
  {
    nombre: "Casa Aura",
    tipo: "casa",
    precioBase: 79750,
    terrenoM2: 105,
    construccionM2: 64,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    dimensionesLote: "15m x 7m",
    caracteristicasJson: JSON.stringify([
      "Lote Esquinero",
      "1 Parqueo",
      "Jardín Frontal",
      "Jardín Trasero",
      "Sala",
      "Área de Lavado",
      "Cocina-Comedor",
      "Cuarto Principal",
      "1 Cuarto Jr.",
      "1 Baño Compartido",
    ]),
    orden: 1,
  },
  {
    nombre: "Casa Brisa",
    tipo: "casa",
    precioBase: 79750,
    terrenoM2: 105,
    construccionM2: 65,
    habitaciones: 2,
    banos: 1,
    parqueos: 1,
    dimensionesLote: "15m x 7m",
    caracteristicasJson: JSON.stringify([
      "1 Parqueo",
      "Jardín Frontal",
      "Jardín Trasero",
      "Sala",
      "Área de Lavado",
      "Cocina-Comedor",
      "Cuarto Principal",
      "1 Cuarto Jr.",
      "1 Baño Compartido",
    ]),
    orden: 2,
  },
  {
    nombre: "Casa Bruma",
    tipo: "casa",
    precioBase: 105000,
    terrenoM2: 105,
    construccionM2: 100,
    habitaciones: 3,
    banos: 3,
    parqueos: 2,
    dimensionesLote: "15m x 7m",
    caracteristicasJson: JSON.stringify([
      "2 Parqueos",
      "Jardín Frontal",
      "Jardín Trasero",
      "Sala",
      "Área de Lavado",
      "Cocina-Comedor",
      "Cuarto Principal",
      "2 Cuartos Jr.",
      "1 Baño Compartido",
      "2 Baños Privados",
    ]),
    orden: 3,
  },
  {
    nombre: "Amanecer Oeste",
    tipo: "apartamento",
    precioBase: 69300,
    terrenoM2: 0,
    construccionM2: 51,
    habitaciones: 2,
    banos: 1,
    parqueos: 0,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala",
      "Cocina-Comedor",
      "Área de Lavado",
      "Cuarto Principal",
      "1 Cuarto Jr.",
      "Baño Compartido",
    ]),
    orden: 10,
  },
  {
    nombre: "Amanecer Este",
    tipo: "apartamento",
    precioBase: 69300,
    terrenoM2: 0,
    construccionM2: 51,
    habitaciones: 2,
    banos: 1,
    parqueos: 0,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala",
      "Cocina-Comedor",
      "Área de Lavado",
      "Cuarto Principal",
      "1 Cuarto Jr.",
      "Baño Compartido",
    ]),
    orden: 11,
  },
  {
    nombre: "Boreal Oeste",
    tipo: "apartamento",
    precioBase: 77275,
    terrenoM2: 0,
    construccionM2: 66,
    habitaciones: 3,
    banos: 2,
    parqueos: 0,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala",
      "Cocina-Comedor",
      "Área de Lavado",
      "Cuarto Principal",
      "2 Cuartos Jr.",
      "1 Baño Compartido",
      "1 Baño Privado",
    ]),
    orden: 12,
  },
  {
    nombre: "Boreal Este",
    tipo: "apartamento",
    precioBase: 77275,
    terrenoM2: 0,
    construccionM2: 66,
    habitaciones: 3,
    banos: 2,
    parqueos: 0,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala",
      "Cocina-Comedor",
      "Área de Lavado",
      "Cuarto Principal",
      "2 Cuartos Jr.",
      "1 Baño Compartido",
      "1 Baño Privado",
    ]),
    orden: 13,
  },
  {
    nombre: "Cénit",
    tipo: "apartamento",
    precioBase: 49900,
    terrenoM2: 0,
    construccionM2: 39,
    habitaciones: 1,
    banos: 1,
    parqueos: 0,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala",
      "Cocina-Comedor",
      "Área de Lavado",
      "Cuarto Principal",
      "1 Baño",
    ]),
    orden: 14,
  },
  {
    nombre: "Destello",
    tipo: "apartamento",
    precioBase: 92500,
    terrenoM2: 0,
    construccionM2: 72,
    habitaciones: 3,
    banos: 2,
    parqueos: 0,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala",
      "Cocina-Comedor",
      "Área de Lavado",
      "Cuarto Principal con Walk-In Closet",
      "2 Cuartos Jr.",
      "1 Baño Compartido",
      "1 Baño Privado",
    ]),
    orden: 15,
  },
];

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[seed] falta DATABASE_URL");
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("[seed] faltan ADMIN_EMAIL y ADMIN_PASSWORD en el entorno");
  process.exit(1);
}

const client = postgres(databaseUrl, { prepare: false });
const db = drizzle(client, { schema: { users, modelos } });

async function seedAdmin(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD");
  }

  const existing = (
    await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1)
  )[0];

  if (existing) {
    console.log(
      `[seed] user "${existing.email}" already exists (id=${existing.id}), skipping.`,
    );
    return;
  }

  const passwordHash = hashPassword(ADMIN_PASSWORD);
  const [inserted] = await db
    .insert(users)
    .values({
      email: ADMIN_EMAIL,
      passwordHash,
    })
    .returning({ id: users.id });

  console.log(
    `[seed] created admin user "${ADMIN_EMAIL}" (id=${inserted?.id})`,
  );
}

async function seedModelos(): Promise<void> {
  const existingNames = await db
    .select({ nombre: modelos.nombre })
    .from(modelos);

  const nombresExistentes = new Set(existingNames.map(({ nombre }) => nombre));
  const modelosAInsertar =
    nombresExistentes.size === 0
      ? AMENA_MODELOS
      : AMENA_MODELOS.filter(
          (modelo) =>
            modelo.tipo === "apartamento" && !nombresExistentes.has(modelo.nombre),
        );

  if (modelosAInsertar.length === 0) {
    console.log("[seed] no hay modelos faltantes para insertar.");
    return;
  }

  for (const modelo of modelosAInsertar) {
    await db.insert(modelos).values(modelo);
  }
  console.log(`[seed] inserted ${modelosAInsertar.length} modelos.`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedModelos();
}

try {
  await main();
} catch (err) {
  console.error("[seed] failed:", err);
  process.exit(1);
} finally {
  await client.end();
}
