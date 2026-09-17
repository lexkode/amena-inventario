CREATE TABLE "lote_respaldos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"total_lotes" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "lote_respaldos_created_at_idx" ON "lote_respaldos" USING btree ("created_at","id");