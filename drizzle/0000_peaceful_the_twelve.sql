CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"imagen_path" text NOT NULL,
	"ancho_px" integer NOT NULL,
	"alto_px" integer NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"precio_base" double precision NOT NULL,
	"terreno_m2" double precision NOT NULL,
	"construccion_m2" double precision NOT NULL,
	"habitaciones" integer NOT NULL,
	"banos" double precision NOT NULL,
	"parqueos" integer DEFAULT 1 NOT NULL,
	"dimensiones_lote" text,
	"caracteristicas_json" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"numero_lote" text NOT NULL,
	"estado" text DEFAULT 'disponible' NOT NULL,
	"poligono_json" text NOT NULL,
	"modelo_id" bigint,
	"terreno_m2" double precision,
	"dimensiones_lote" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lote_imagenes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lote_id" bigint NOT NULL,
	"path" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_imagenes" ADD CONSTRAINT "lote_imagenes_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE cascade ON UPDATE no action;