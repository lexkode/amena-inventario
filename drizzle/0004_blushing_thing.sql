CREATE TABLE "marca" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"colores_json" text NOT NULL,
	"logo_front_path" text,
	"logo_admin_path" text,
	"logo_admin_colapsado_path" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
