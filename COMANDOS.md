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

### ¿Por qué va lenta la app?

```bash
npm run velocidad
```

Entra en **producción** con una cuenta de prueba y **con la red limitada a 4G
lento**, recorre las pantallas y dice de cada una cuánto tarda en verse, cuántos
bytes baja y cuáles son las peticiones más lentas. Al final, la lista de peor a
mejor.

No hace falta `npm run dev`: mide gooals.app, no tu ordenador. Medir en local
con fibra dice que todo va bien siempre, y por eso no sirve.

Tarda unos diez minutos. Crea una cuenta de prueba con hasta 220 gooals y la
borra al terminar.

No hace falta recontar después: la siembra escribe directamente con la clave de
servicio, así que el contador `veces_completado` del catálogo ni se entera
(comprobado, 0 descuadres). Si algún día esa siembra pasa a marcar gooals *por
la app*, entonces sí haría falta.

### La revisión pantalla por pantalla

```bash
npm run revision
```

Abre las pantallas en producción con una cuenta que TIENE datos —14 conseguidos
(uno con foto propia), 7 pendientes, una amiga y un post en el muro— en dos
móviles, el común y el corto, y guarda una captura de cada una en
`Claude outputs/revision/`.

No mide nada: las capturas son para MIRARLAS. `npm run pantallas` mide si algo
se sale por el lado; esto es para lo otro — lo que queda tapado, lo que sale
vacío, lo que se corta.

### ¿Salen bien las fotos reducidas?

```bash
npm run fotos
```

Pide cada tamaño de verdad a Supabase y comprueba que lo que llega tiene la
proporción correcta y pesa menos. Existe porque una dirección mal construida
**no da error**: devuelve una imagen más pequeña y recortada, y todo parece
bien hasta que alguien mira una foto de cerca.

Tiene que decir **TODAS BIEN**.

### Has tocado el botón de compartir

```bash
npm run dev          # en una ventana, y lo dejas abierto
npm run compartir    # en otra
```

Entra de verdad en la app con una cuenta de prueba, abre la ficha de un gooal,
**pulsa el botón con un dedo de verdad** y mira qué manda: que la dirección
lleve tu @usuario, que esa dirección funcione sin cuenta y que no se escape
ningún correo. Al terminar borra la cuenta.

Tiene que decir **TODO BIEN**. Si alguna línea empieza por `NO`, ahí está el
fallo y la línea dice cuál.

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

`insertar.mjs` es idempotente: compara el título, en cualquier categoría, así
que relanzarlo no duplica nada. Solo mete lo que falte.

Los PDFs traen siete categorías de **origen** y la app tiene seis. El reparto
de uno a otro está en `scripts/seed-gooals/reparto_categorias.txt`: si quieres
que un reto vaya a otra categoría, cámbialo ahí.

Un solo PDF (por su origen) y una sola categoría (de las seis):

```bash
python generar_sql.py ../../RETOS aventura   # escribe output/aventura-a-<categoría>.sql
node insertar.mjs naturaleza
```

> Ojo: generando un solo PDF **no se aplica el dedupe entre PDFs**, porque
> para saber que "Visitar Museo del Prado" está en viajes hay que haber
> generado viajes. Para el catálogo bueno, genera siempre todos.

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
where g.categoria = 'naturaleza';

delete from gooals_v2 where categoria = 'naturaleza';
```

Y luego, desde `scripts/seed-gooals/`:

```bash
node insertar.mjs naturaleza
```

Si el count no da 0, **no borres**: desactiva en vez de borrar, así el histórico
de puntos de la gente sigue en pie.

```sql
update gooals_v2 set activo = false where categoria = 'naturaleza';
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
- La app es gratuita. No hay pasarela de pago.
- `.env.local` tiene la `service_role` de Supabase y otras claves. No debe
  acabar en git — está en `.gitignore`, pero conviene mirar `git status` antes
  de un `git add -A`.
