CREATE TABLE "torres" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"grupo" jsonb NOT NULL,
	"nombre_nivel" text DEFAULT 'Planta' NOT NULL,
	"poligono_json" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "torres_grupo_unique" ON "torres" USING btree ("grupo");
--> statement-breakpoint
-- Preserve buildings created by the earlier base system, which had no perimeter.
INSERT INTO "torres" ("grupo", "nombre_nivel", "poligono_json", "created_at", "updated_at")
SELECT "grupo", min("nombre_nivel"),
  jsonb_build_array(
    jsonb_build_object('x', min((p->>'x')::double precision), 'y', min((p->>'y')::double precision)),
    jsonb_build_object('x', max((p->>'x')::double precision), 'y', min((p->>'y')::double precision)),
    jsonb_build_object('x', max((p->>'x')::double precision), 'y', max((p->>'y')::double precision)),
    jsonb_build_object('x', min((p->>'x')::double precision), 'y', max((p->>'y')::double precision))
  )::text, min("created_at"), max("updated_at")
FROM "lotes" CROSS JOIN LATERAL jsonb_array_elements("poligono_json"::jsonb) AS p
WHERE "tipo_vivienda" = 'apartamento' AND "grupo" IS NOT NULL
GROUP BY "grupo";
