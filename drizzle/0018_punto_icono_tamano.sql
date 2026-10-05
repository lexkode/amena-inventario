ALTER TABLE "puntos_interes" ADD COLUMN "icono_path" text;--> statement-breakpoint
ALTER TABLE "puntos_interes" ADD COLUMN "tamano_icono" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "puntos_interes" ADD CONSTRAINT "puntos_interes_tamano_icono_check" CHECK ("puntos_interes"."tamano_icono" BETWEEN 25 AND 300);