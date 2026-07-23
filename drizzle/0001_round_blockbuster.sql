CREATE TABLE `modelos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`precio_base` real NOT NULL,
	`terreno_m2` real NOT NULL,
	`construccion_m2` real NOT NULL,
	`habitaciones` integer NOT NULL,
	`banos` real NOT NULL,
	`parqueos` integer DEFAULT 1 NOT NULL,
	`dimensiones_lote` text,
	`caracteristicas_json` text,
	`orden` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `planos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`imagen_path` text NOT NULL,
	`ancho_px` integer NOT NULL,
	`alto_px` integer NOT NULL,
	`created_at` integer NOT NULL
);
