CREATE TABLE `lotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero_lote` text NOT NULL,
	`estado` text DEFAULT 'disponible' NOT NULL,
	`poligono_json` text NOT NULL,
	`modelo_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`modelo_id`) REFERENCES `modelos`(`id`) ON UPDATE no action ON DELETE set null
);
