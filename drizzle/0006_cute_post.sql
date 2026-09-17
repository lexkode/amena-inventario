CREATE TABLE "punto_interes_imagenes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"punto_id" bigint NOT NULL,
	"path" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punto_publicaciones" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"snapshot_json" text NOT NULL,
	"total_puntos" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puntos_interes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"informacion" text NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "punto_interes_imagenes" ADD CONSTRAINT "punto_interes_imagenes_punto_id_puntos_interes_id_fk" FOREIGN KEY ("punto_id") REFERENCES "public"."puntos_interes"("id") ON DELETE cascade ON UPDATE no action;