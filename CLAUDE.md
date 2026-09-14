@AGENTS.md

# GooALS

App de retos ("gooals") con muro social, puntos y seguidores. Next.js 16 + React
19 + Supabase, desplegada en Vercel bajo gooals.app.

La app es gratuita. No hay pasarela de pago.

El repo se llama `nuestrahistoria` por razones históricas: el producto es GooALS.

## Antes de tocar nada

Este proyecto lo lleva alguien que **no es programador**. Eso cambia dos cosas:

1. **Explica en lenguaje llano, no en jerga.** "La app se trae 1.000 filas y
   filtra en el navegador" se entiende; "el límite por defecto de PostgREST"
   no, salvo que lo acompañes.
2. **No des por hecho que puede ejecutar cosas.** Da el comando entero, listo
   para copiar, y di qué debería ver al ejecutarlo.

## Arquitectura

```
src/app/          rutas (App Router). Casi todas son componentes de cliente.
src/components/   UI. admin/ son las secciones del panel.
src/lib/          lógica compartida
src/types/        tipos. gooals.ts = Fase 3; planes.ts = arquitectura anterior.
supabase/*.sql    esquema. NO se ejecuta solo: se pega en el SQL Editor.
scripts/          herramientas locales de siembra. No forman parte de la app.
RETOS/            los PDFs fuente del catálogo.
```

### Clientes de Supabase — hay tres y no son intercambiables

| Módulo | Cuándo |
|---|---|
| `@/lib/supabase/client` | Componentes de cliente (`'use client'`). Lleva PKCE, que es lo que hace funcionar el login por enlace. |
| `@/lib/supabase/server` | Server Actions y rutas que necesitan **la sesión del usuario**. Lee las cookies. |
| `@/lib/supabase/service` | Service role. Salta la RLS. Solo en servidor, nunca importado desde un `'use client'`. |

Hubo un tiempo en que había cinco módulos, tres de ellos casi iguales. Si ves
`@/lib/supabase-server`, `@/lib/supabase-browser` o `@/lib/supabase` en algún
sitio, es código viejo: ya no existen.

### La RLS es deliberadamente restrictiva

Solo `gooals_v2` tiene lectura pública. Todo lo demás se lee y escribe con el
service role desde el servidor. **No se crean políticas de RLS a propósito**:
así la anon key —que es pública— no puede insertar likes, follows ni posts en
nombre de nadie. Si algo "no se puede leer desde el cliente", suele ser eso, y
la solución es una Server Action, no una política nueva.

### Administración

`/admin` exige sesión (en `src/proxy.ts`) **y** que `profiles.es_admin` sea
`true`, que se comprueba en el servidor con `esAdmin()` de `@/lib/admin-auth`.
Toda ruta bajo `/api/admin/` y `/api/admin-stats` empieza por esa comprobación.

Nunca metas una contraseña de admin en un componente de cliente: el bundle es
público. Esto ya pasó una vez y expuso el email de todos los usuarios.

## Reglas del dominio

### El baremo de puntos vive en DOS sitios

`facil` = 1 · `dificil` = 5 · `epico` = 10

- `src/lib/gooals.ts` → `DIFICULTAD_META`, lo que aplica la app
- `scripts/seed-gooals/generar_sql.py` → `PUNTOS`, lo que se siembra

**Si cambias uno, cambia el otro.** Los puntos se guardan en la fila de
`gooals_v2` a propósito: así un cambio de baremo no reescribe el histórico de
puntos ya ganados.

### Un gooal es una experiencia, no un sitio

Un gooal debe ser algo distinto de hacer, no la misma actividad en otro lugar.
"Esquiar en Laax" y "Esquiar en Andorra" son el mismo recuerdo y darían puntos
dos veces, así que el catálogo los tiene fundidos en "Esquiar una jornada
completa en estación", sin ciudad ni país.

La regla, para cuando haya que decidir sobre uno nuevo:

> **El lugar se queda cuando ES el objetivo** (una cumbre, un trek con nombre,
> una cueva única). **Se va cuando es una sede intercambiable** (una estación,
> un spot, un circuito).

Por eso `viajes` y `cultura` llevan lugar en todas sus filas y `deporte` no lo
lleva en ninguna.

### El catálogo tiene menos retos que los PDFs, y está bien

Los PDFs declaran 5.218; en `gooals_v2` hay 4.931. **No es una fuga.** Se
descartan por tres motivos, y `generar_sql.py` imprime un cuadre que dice
exactamente cuántos por cada uno:

- fusiones (`scripts/seed-gooals/fusiones_aventura.txt`)
- títulos repetidos dentro del propio PDF
- copias que se lleva otra categoría (un sitio está en dos PDFs y daría puntos
  dos veces)

Lo único que valida al parser es que las columnas `PDF` y `extrae` del cuadre
coincidan. Si no coinciden, el script lo avisa por stderr.

Esto ya ha generado dos falsas alarmas. Antes de reportar que "faltan retos",
mira el cuadre.

## Comandos

Está todo en `COMANDOS.md`, en la raíz. Lo esencial:

```bash
npm run dev                              # arranca en localhost:3000
npx tsc --noEmit && npm run lint && npm run build   # antes de publicar
```

El catálogo, desde `scripts/seed-gooals/`:

```bash
python generar_sql.py ../../RETOS
node insertar.mjs --dry-run
node insertar.mjs
```

`insertar.mjs` es idempotente pero **solo añade, nunca borra**: para rehacer una
categoría hay que vaciarla antes en Supabase, comprobando primero que nadie la
tenga en su lista (`user_gooals` tiene `on delete cascade`).

## Convenciones

- **El código y los comentarios, en español.** Es lo que hay en todo el repo.
- Los comentarios explican **por qué**, no qué. Si una decisión tiene una razón
  no obvia (un desempate por `id`, una RLS ausente a propósito), escríbela.
- Estilos en línea con `style={{}}`, no clases de Tailwind, salvo utilidades
  sueltas. Es lo que ya hay; no mezcles enfoques a mitad de fichero.
- Paginación: nunca un `.select()` sin `.range()` sobre una tabla que puede
  crecer. PostgREST corta en 1.000 filas y falla en silencio. Esto ya rompió
  Explorar una vez.

## Deuda conocida

- `src/lib/actions.ts` tiene ~1.700 líneas con todo mezclado: planes, perfiles,
  gooals, muro, follows. Pendiente de partir por temas.
- Conviven tres catálogos: `gooals_v2` (el bueno), `gooals` (v1) y la biblioteca
  de `experiencias` de la migración. Falta decidir qué se retira.
- No hay tests.
