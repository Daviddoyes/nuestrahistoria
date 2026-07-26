# Generador de experiencias

Script **local** para poblar la tabla `experiencias` de Supabase. **No forma
parte de la app Next.js** y no se despliega en Vercel: se ejecuta a mano desde
tu máquina cuando quieras ampliar la biblioteca.

Fases:

1. **Fase 1 — Lugares físicos (Google Places → `gooal_lugares`).** Busca el
   SITIO donde se hace cada actividad (rocódromo, playa de surf, estación de
   esquí, museo…), no el proveedor que la organiza. Se queda con los de rating
   ≥ 4.0 y ≥ 50 reseñas y los inserta **directamente en `gooal_lugares`**,
   buscando el gooal por `subcategoria` (y creándolo si no existe). El
   `nombre_lugar` es siempre `displayName` de Google Maps. No usa Claude.
2. **Fase 2 — Icónicas.** Lista fija de experiencias globales → `experiencias`.
3. **Fase 3 — Festivales de España.** Lista curada; Claude redacta la
   descripción → `experiencias`.
4. **Fase 4 — Migración.** Pasa las `experiencias` verificadas a `gooals` +
   `gooal_lugares` (genéricas agrupadas, eventos únicos uno a uno). Opt-in.
5. **Fase 5 — Limpieza.** Borra de `gooal_lugares` los sitios cuyo nombre parece
   de empresa (`S.L.`, `Club`, `Sports`, `Academy`, `.com`…). Opt-in.

Dedup: Fase 1 y Fase 4 evitan duplicar por `gooal_id` + `nombre_lugar`; las
fases 2-3 por `lugar_nombre` + `ciudad`. Relanzar es idempotente.

## Ejecutar solo algunas fases

```bash
node index.mjs        # fases 1-3 (por defecto)
node index.mjs 1      # solo lugares físicos → gooal_lugares
node index.mjs 4      # solo migración experiencias → gooals
node index.mjs 5      # solo limpieza de nombres de empresa
```

## Requisitos

- **Node.js 18 o superior** (usa `fetch` nativo).
- La tabla `experiencias` creada en Supabase — ver `supabase/experiencias.sql`
  en la raíz del repo. Incluye las columnas `latitud` / `longitud` que este
  script rellena; si creaste la tabla con una versión anterior, vuelve a
  ejecutar ese `.sql` (los `add column if not exists` son idempotentes).

## Configuración

Rellena `scripts/generar-experiencias/.env` (ya está gitignoreado):

```
GOOGLE_PLACES_API_KEY=...      # con la API "Places API (New)" activada
ANTHROPIC_API_KEY=...          # sustituye el valor de ejemplo
SUPABASE_URL=https://rlbwcgkxbheldzgtycrf.supabase.co
SUPABASE_SERVICE_KEY=...       # service_role, NUNCA la anon
```

> El `SUPABASE_URL` de ejemplo apunta al mismo proyecto que la app, para que las
> experiencias aparezcan en `/admin`. Verifícalo contra `NEXT_PUBLIC_SUPABASE_URL`
> de la app si en algún momento no coinciden.

## Ejecutar

```bash
cd scripts/generar-experiencias
npm install
node index.mjs
```

Verás el progreso por consola:

```
Buscando karting en Barcelona...
  ✓ Guardada: Karting Costa Daurada, Barcelona (4.5★)
  ✗ Saltada: Kartland rating 3.2 / 40 reseñas
...
Total generadas: 137 experiencias
```

## Ajustes

En la cabecera de `index.mjs`:

- `MIN_RATING`, `MIN_RESENAS` — umbral de calidad de Google Places.
- `MAX_POR_BUSQUEDA` — cuántos lugares coger por búsqueda y ciudad (por defecto
  5, para no disparar el número de llamadas a Claude).
- `PAUSA_MS` — pausa entre llamadas a Claude.

## Coste y seguridad

- Cada lugar que pasa el filtro es **una llamada a la API de Anthropic**. Con la
  configuración por defecto son ~800 llamadas como máximo (15 búsquedas × 11
  ciudades × 5). Súbelo o bájalo con `MAX_POR_BUSQUEDA`.
- La `service_role` key **salta la RLS**: es solo para este script en tu
  máquina. Nunca la pongas en el cliente ni en una variable `NEXT_PUBLIC_`.
- El `.env` está gitignoreado. No lo subas.
