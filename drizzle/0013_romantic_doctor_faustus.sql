ALTER TABLE "lotes" ADD COLUMN "torre_id" bigint;--> statement-breakpoint
UPDATE "lotes" SET "torre_id" = "torres"."id" FROM "torres" WHERE "lotes"."tipo_vivienda" = 'apartamento' AND "lotes"."grupo" = "torres"."grupo";--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_torre_id_torres_id_fk" FOREIGN KEY ("torre_id") REFERENCES "public"."torres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_torre_check" CHECK (("lotes"."tipo_vivienda" = 'casa' AND "lotes"."torre_id" IS NULL) OR ("lotes"."tipo_vivienda" = 'apartamento' AND "lotes"."torre_id" IS NOT NULL));
