CREATE TYPE "public"."estado_comercio" AS ENUM('PENDIENTE', 'ACTIVO', 'SUSPENDIDO');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('SUPERADMIN', 'COMERCIO_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."tipo_entrega" AS ENUM('ENVIO', 'RETIRO');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categorias_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comercio_id" integer NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comercios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comercios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nombre" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"rubro_id" integer NOT NULL,
	"whatsapp" varchar(13) NOT NULL,
	"direccion" varchar(150),
	"localidad" varchar(80) NOT NULL,
	"logo_url" text,
	"estado" "estado_comercio" DEFAULT 'PENDIENTE' NOT NULL,
	"acepta_envio" boolean DEFAULT true NOT NULL,
	"acepta_retiro" boolean DEFAULT true NOT NULL,
	"pedido_minimo" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comercios_slug_unique" UNIQUE("slug"),
	CONSTRAINT "comercios_whatsapp_formato" CHECK ("comercios"."whatsapp" ~ '^549[0-9]{10}$'),
	CONSTRAINT "comercios_pedido_minimo_positivo" CHECK ("comercios"."pedido_minimo" >= 0),
	CONSTRAINT "comercios_alguna_entrega" CHECK ("comercios"."acepta_envio" OR "comercios"."acepta_retiro")
);
--> statement-breakpoint
CREATE TABLE "horarios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "horarios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comercio_id" integer NOT NULL,
	"dia_semana" integer NOT NULL,
	"abre" varchar(5) NOT NULL,
	"cierra" varchar(5) NOT NULL,
	CONSTRAINT "horarios_dia_valido" CHECK ("horarios"."dia_semana" BETWEEN 0 AND 6),
	CONSTRAINT "horarios_abre_formato" CHECK ("horarios"."abre" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "horarios_cierra_formato" CHECK ("horarios"."cierra" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pedidos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comercio_id" integer NOT NULL,
	"tipo_entrega" "tipo_entrega" NOT NULL,
	"total" integer NOT NULL,
	"detalle" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "productos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comercio_id" integer NOT NULL,
	"categoria_id" integer NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" varchar(300),
	"precio" integer NOT NULL,
	"imagen_url" text,
	"disponible" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_precio_positivo" CHECK ("productos"."precio" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rubros" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rubros_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nombre" varchar(60) NOT NULL,
	CONSTRAINT "rubros_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usuarios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(150) NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol" NOT NULL,
	"comercio_id" integer,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_rol_comercio" CHECK (("usuarios"."rol" = 'SUPERADMIN' AND "usuarios"."comercio_id" IS NULL) OR ("usuarios"."rol" = 'COMERCIO_ADMIN' AND "usuarios"."comercio_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "variantes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "variantes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"producto_id" integer NOT NULL,
	"nombre" varchar(60) NOT NULL,
	"precio" integer NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variantes_precio_positivo" CHECK ("variantes"."precio" >= 0)
);
--> statement-breakpoint
CREATE TABLE "zonas_envio" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "zonas_envio_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"comercio_id" integer NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"costo" integer NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "zonas_envio_costo_positivo" CHECK ("zonas_envio"."costo" >= 0)
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_comercio_id_comercios_id_fk" FOREIGN KEY ("comercio_id") REFERENCES "public"."comercios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comercios" ADD CONSTRAINT "comercios_rubro_id_rubros_id_fk" FOREIGN KEY ("rubro_id") REFERENCES "public"."rubros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_comercio_id_comercios_id_fk" FOREIGN KEY ("comercio_id") REFERENCES "public"."comercios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_comercio_id_comercios_id_fk" FOREIGN KEY ("comercio_id") REFERENCES "public"."comercios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_comercio_id_comercios_id_fk" FOREIGN KEY ("comercio_id") REFERENCES "public"."comercios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_comercio_id_comercios_id_fk" FOREIGN KEY ("comercio_id") REFERENCES "public"."comercios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zonas_envio" ADD CONSTRAINT "zonas_envio_comercio_id_comercios_id_fk" FOREIGN KEY ("comercio_id") REFERENCES "public"."comercios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categorias_comercio_orden_idx" ON "categorias" USING btree ("comercio_id","orden");--> statement-breakpoint
CREATE INDEX "comercios_estado_localidad_idx" ON "comercios" USING btree ("estado","localidad");--> statement-breakpoint
CREATE INDEX "comercios_rubro_idx" ON "comercios" USING btree ("rubro_id");--> statement-breakpoint
CREATE INDEX "horarios_comercio_idx" ON "horarios" USING btree ("comercio_id");--> statement-breakpoint
CREATE INDEX "pedidos_comercio_fecha_idx" ON "pedidos" USING btree ("comercio_id","created_at");--> statement-breakpoint
CREATE INDEX "productos_comercio_idx" ON "productos" USING btree ("comercio_id");--> statement-breakpoint
CREATE INDEX "productos_categoria_orden_idx" ON "productos" USING btree ("categoria_id","orden");--> statement-breakpoint
CREATE INDEX "usuarios_comercio_idx" ON "usuarios" USING btree ("comercio_id");--> statement-breakpoint
CREATE INDEX "variantes_producto_idx" ON "variantes" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "zonas_envio_comercio_idx" ON "zonas_envio" USING btree ("comercio_id");