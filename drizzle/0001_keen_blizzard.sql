CREATE TABLE "lote_publicaciones" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"snapshot_json" text NOT NULL,
	"total_lotes" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
