DROP INDEX "lotes_grupo_numero_unique";--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "tipo_vivienda" text DEFAULT 'casa' NOT NULL;--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "nivel" integer;--> statement-breakpoint
ALTER TABLE "lotes" ADD COLUMN "nombre_nivel" text DEFAULT 'Planta' NOT NULL;--> statement-breakpoint
ALTER TABLE "marca" ADD COLUMN "nombre_torre" text DEFAULT 'Torre' NOT NULL;--> statement-breakpoint
ALTER TABLE "marca" ADD COLUMN "tipo_identificador_torre" text DEFAULT 'alfabetico' NOT NULL;--> statement-breakpoint
ALTER TABLE "marca" ADD COLUMN "nombre_nivel" text DEFAULT 'Planta' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "apartamentos_torre_nivel_numero_unique" ON "lotes" USING btree ("grupo","nivel","numero_lote") WHERE "lotes"."tipo_vivienda" = 'apartamento';--> statement-breakpoint
CREATE UNIQUE INDEX "lotes_grupo_numero_unique" ON "lotes" USING btree ("grupo","numero_lote") WHERE "lotes"."grupo" IS NOT NULL AND "lotes"."tipo_vivienda" = 'casa';--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_ubicacion_check" CHECK (("lotes"."tipo_vivienda" = 'casa' AND "lotes"."nivel" IS NULL) OR ("lotes"."tipo_vivienda" = 'apartamento' AND "lotes"."grupo" IS NOT NULL AND "lotes"."nivel" IS NOT NULL AND "lotes"."nivel" > 0));