ALTER TABLE "lotes" ADD COLUMN "grupo" jsonb;--> statement-breakpoint
ALTER TABLE "marca" ADD COLUMN "nombre_grupo" text DEFAULT 'Polígono' NOT NULL;--> statement-breakpoint
ALTER TABLE "marca" ADD COLUMN "tipo_identificador_grupo" text DEFAULT 'alfabetico' NOT NULL;