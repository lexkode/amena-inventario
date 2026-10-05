ALTER TABLE "torres" ADD COLUMN "nombre_personalizado" text;--> statement-breakpoint
ALTER TABLE "torres" ADD COLUMN "cantidad_niveles" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "torres" ADD COLUMN "imagenes_nivel" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "torres" SET "cantidad_niveles" = GREATEST(1, COALESCE((SELECT MAX("nivel") FROM "lotes" WHERE "torre_id" = "torres"."id"), 1));--> statement-breakpoint
ALTER TABLE "torres" ADD CONSTRAINT "torres_niveles_check" CHECK ("torres"."cantidad_niveles" BETWEEN 1 AND 200);
