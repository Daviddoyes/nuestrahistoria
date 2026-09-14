# Comandos de GooALS

Chuleta para copiar y pegar. Ordenada por **qué has cambiado**, no por herramienta.

Todo se ejecuta desde la raíz del repo salvo lo del catálogo, que va desde
`scripts/seed-gooals/`.

---

## Antes de nada: el ciclo normal

```bash
npm run dev
```

Levanta la app en http://localhost:3000. Déjalo corriendo en una terminal y usa
otra para el resto.

Antes de dar por bueno un cambio de código:

```bash
npx tsc --noEmit     # errores de tipos (no los ves en dev hasta que rompe)
npm run lint
npm run build        # lo que de verdad ejecuta Vercel
```

`npm run dev` compila por página y perdona cosas que `npm run build` no. Si vas
a desplegar, pasa el build.

---

## Has tocado el código de la app

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Los tres de una tirada. Si falla uno, para y arréglalo antes de seguir.

---

## Has tocado los PDFs, el parser o las fusiones

Los ficheros en juego son `RETOS/*.pdf`, `scripts/seed-gooals/generar_sql.py` y
`scripts/seed-gooals/fusiones_aventura.txt`.

```bash
cd scripts/seed-gooals

python generar_sql.py ../../RETOS      # PDFs -> output/*.sql + gooals.json
node insertar.mjs --dry-run            # cuenta lo que insertaría, no escribe
node insertar.mjs                      # inserta de verdad
```

**Mira el cuadre que imprime `generar_sql.py`.** Si la columna `PDF` y la
columna `extrae` no coinciden, el parser se está dejando líneas y el script lo
avisa por stderr. Que el total final sea menor que el del PDF es normal: son las
fusiones y las copias cedidas a otra categoría. Está explicado en
`scripts/seed-gooals/README.md`.

`insertar.mjs` es idempotente: compara título + categoría, así que relanzarlo no
duplica nada. Solo mete lo que falte.

Una sola categoría:

```bash
python generar_sql.py ../../RETOS musica
node insertar.mjs musica
```

> Ojo: generando una sola categoría **no se aplica el dedupe entre categorías**,
> porque para saber que "Visitar Museo del Prado" está en viajes hay que haber
> generado viajes. Para el catálogo bueno, genera siempre las seis.

### Rehacer una categoría entera

Si cambian las fusiones o la dificultad, los gooals viejos siguen en la tabla:
`insertar.mjs` añade, no borra. Hay que limpiarla antes.

En el **SQL Editor de Supabase**:

```sql
-- Comprueba primero que nadie la tiene en su lista: si esto no da 0,
-- borrar arrastra los user_gooals por el on delete cascade.
select count(*)
from user_gooals ug
join gooals_v2 g on g.id = ug.gooal_id
where g.categoria = 'aventura';

delete from gooals_v2 where categoria = 'aventura';
```

Y luego, desde `scripts/seed-gooals/`:

```bash
node insertar.mjs aventura
```

Si el count no da 0, **no borres**: desactiva en vez de borrar, así el histórico
de puntos de la gente sigue en pie.

```sql
update gooals_v2 set activo = false where categoria = 'aventura';
```

---

## Has tocado el esquema

Los `.sql` de `supabase/` no se ejecutan solos. Se pegan a mano en el **SQL
Editor de Supabase**, en orden:

| Fichero | Qué crea |
|---|---|
| `supabase/fase3.sql` | `gooals_v2`, `user_gooals`, `muro_posts`, `post_likes`, `follows` |
| `supabase/fase3b.sql` | `gooal_sugerencias` + índices de rendimiento de Explorar |

Son idempotentes (`create table if not exists`), así que relanzarlos no rompe
nada.

---

## Comprobar el estado del catálogo

En el SQL Editor:

```sql
-- Cuántos hay por categoría y dificultad
select categoria, dificultad, count(*), sum(puntos)
from gooals_v2 where activo
group by categoria, dificultad
order by categoria, dificultad;

-- Total
select count(*) as gooals, sum(puntos) as puntos
from gooals_v2 where activo;

-- Títulos repetidos entre categorías (deberían ser 0)
select lower(titulo), count(*), array_agg(categoria)
from gooals_v2 group by 1 having count(*) > 1;

-- Dificultad y puntos descuadrados (deberían ser 0)
select count(*) from gooals_v2
where puntos <> case dificultad
  when 'facil' then 1 when 'dificil' then 5 when 'epico' then 10 end;

-- Cola de sugerencias
select estado, count(*) from gooal_sugerencias group by estado;
```

---

## Desplegar

```bash
git status
git add -A
git commit -m "Explorar: filtros en servidor y sugerencias con moderación"
git push
```

Vercel despliega solo al hacer push. **Las variables de entorno de `.env.local`
no viajan con el push**: si añades una, hay que darla de alta también en el
panel de Vercel.

---

## Cosas que se olvidan

- El baremo de puntos está en **dos sitios**: `src/lib/gooals.ts` (lo que aplica
  la app) y `scripts/seed-gooals/generar_sql.py` (lo que se siembra). Si tocas
  uno, toca el otro.
- `scripts/seed-gooals/` es siembra local. No forma parte de la app y no se
  despliega.
- `.env.local` tiene claves de Stripe y la `service_role` de Supabase. No debe
  acabar en git — está en `.gitignore`, pero conviene mirar `git status` antes
  de un `git add -A`.
