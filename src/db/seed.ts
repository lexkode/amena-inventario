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
      "Jardín Frontal",
      "Jardín Trasero",
      "Sala",
      "Área de Lavado",
      "Cocina-Comedor",
      "Cuarto Principal",
      "Cuarto Jr.",
      "1 Baño Compartido",
      "1 Baño Privado",
    ]),
    orden: 0,
  },
  {
    nombre: "Casa Aura",
    tipo: "casa",
    precioBase: 112500,
    terrenoM2: 126,
    construccionM2: 88,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    dimensionesLote: "18m x 7m",
    caracteristicasJson: JSON.stringify([
      "Jardín Frontal",
      "Jardín Trasero",
      "Sala",
      "Comedor",
      "Cocina",
      "Cuarto Principal con Walk-in Closet y Baño Privado",
      "Cuarto Jr. con Baño Compartido",
      "Área de Lavado",
      "Garaje Techado",
    ]),
    orden: 1,
  },
  {
    nombre: "Casa Brisa",
    tipo: "casa",
    precioBase: 124900,
    terrenoM2: 140,
    construccionM2: 95,
    habitaciones: 2,
    banos: 2.5,
    parqueos: 1,
    dimensionesLote: "20m x 7m",
    caracteristicasJson: JSON.stringify([
      "Jardín Frontal",
      "Jardín Trasero con Patio",
      "Sala-Comedor",
      "Cocina con Desayunador",
      "Cuarto Principal con Walk-in Closet y Baño Privado",
      "Cuarto Jr. con Baño",
      "Estudio",
      "Área de Lavado Techada",
      "Garaje Techado",
    ]),
    orden: 2,
  },
  {
    nombre: "Casa Bruma",
    tipo: "casa",
    precioBase: 148750,
    terrenoM2: 168,
    construccionM2: 118,
    habitaciones: 3,
    banos: 2.5,
    parqueos: 2,
    dimensionesLote: "24m x 7m",
    caracteristicasJson: JSON.stringify([
      "Jardín Frontal",
      "Jardín Trasero Amplio",
      "Sala",
      "Comedor Formal",
      "Cocina Integral con Isla",
      "Cuarto de Servicio con Baño",
      "Área de Lavado Techada",
      "Cuarto Principal con Walk-in Closet y Baño Privado",
      "2 Cuartos Jr. con Baño Compartido",
      "Estudio / Oficina",
      "Garaje Techado para 2 Vehículos",
    ]),
    orden: 3,
  },
  {
    nombre: "Amanecer Oeste",
    tipo: "apartamento",
    precioBase: 64900,
    terrenoM2: 0,
    construccionM2: 55,
    habitaciones: 2,
    banos: 1,
    parqueos: 1,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala-Comedor",
      "Cocina",
      "Área de Lavado",
      "Cuarto Principal",
      "Cuarto Jr.",
      "Baño Compartido",
      "1 Parqueo",
      "Balcón",
    ]),
    orden: 10,
  },
  {
    nombre: "Amanecer Este",
    tipo: "apartamento",
    precioBase: 64900,
    terrenoM2: 0,
    construccionM2: 55,
    habitaciones: 2,
    banos: 1,
    parqueos: 1,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala-Comedor",
      "Cocina",
      "Área de Lavado",
      "Cuarto Principal",
      "Cuarto Jr.",
      "Baño Compartido",
      "1 Parqueo",
      "Balcón",
    ]),
    orden: 11,
  },
  {
    nombre: "Boreal Oeste",
    tipo: "apartamento",
    precioBase: 78500,
    terrenoM2: 0,
    construccionM2: 65,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala-Comedor",
      "Cocina con Desayunador",
      "Área de Lavado",
      "Cuarto Principal con Walk-in Closet y Baño Privado",
      "Cuarto Jr.",
      "Baño Compartido",
      "1 Parqueo",
      "Balcón",
    ]),
    orden: 12,
  },
  {
    nombre: "Boreal Este",
    tipo: "apartamento",
    precioBase: 78500,
    terrenoM2: 0,
    construccionM2: 65,
    habitaciones: 2,
    banos: 2,
    parqueos: 1,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala-Comedor",
      "Cocina con Desayunador",
      "Área de Lavado",
      "Cuarto Principal con Walk-in Closet y Baño Privado",
      "Cuarto Jr.",
      "Baño Compartido",
      "1 Parqueo",
      "Balcón",
    ]),
    orden: 13,
  },
  {
    nombre: "Cénit",
    tipo: "apartamento",
    precioBase: 92500,
    terrenoM2: 0,
    construccionM2: 80,
    habitaciones: 3,
    banos: 2,
    parqueos: 1,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala-Comedor",
      "Cocina Integral",
      "Cuarto de Servicio",
      "Área de Lavado",
      "Cuarto Principal con Walk-in Closet y Baño Privado",
      "2 Cuartos Jr. con Baño Compartido",
      "1 Parqueo",
      "Balcón Amplio",
    ]),
    orden: 14,
  },
  {
    nombre: "Destello",
    tipo: "apartamento",
    precioBase: 109800,
    terrenoM2: 0,
    construccionM2: 95,
    habitaciones: 3,
    banos: 2.5,
    parqueos: 2,
    dimensionesLote: null,
    caracteristicasJson: JSON.stringify([
      "Sala-Comedor",
      "Cocina Integral con Isla",
      "Cuarto de Servicio con Baño",
      "Área de Lavado",
      "Cuarto Principal con Walk-in Closet y Baño Privado",
      "2 Cuartos Jr. con Baño Compartido",
      "Estudio",
      "2 Parqueos",
      "Balcón Amplio con Vista",
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
  const existing = (
    await db
      .select({ id: modelos.id })
      .from(modelos)
      .limit(1)
  )[0];

  if (existing) {
    console.log(`[seed] modelos table not empty, skipping seed.`);
    return;
  }

  for (const m of AMENA_MODELOS) {
    await db.insert(modelos).values(m);
  }
  console.log(`[seed] inserted ${AMENA_MODELOS.length} modelos.`);
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