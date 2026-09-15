# Seed de Gooals

Convierte los PDFs de retos en el catálogo `gooals_v2`. Dos pasos: primero se
genera, luego se siembra.

```bash
# 1. PDFs -> output/*.sql + gooals.json
pip install pypdf
python generar_sql.py ../../RETOS

# 2. gooals.json -> Supabase (idempotente)
node insertar.mjs --dry-run     # cuenta lo que insertaría, no escribe
node insertar.mjs               # inserta de verdad
node insertar.mjs naturaleza    # solo una categoría
```

## Origen y categoría

Los PDFs llegan con **siete categorías de origen** (viajes, deporte, aventura,
gastronomía, cultura, música, espectáculos) y la app tiene **seis categorías**
(viajes, naturaleza, eventos, deporte, gastronomía, vida). `generar_sql.py`
trabaja todo el rato por origen y solo al final reparte:

- cada origen tiene un destino por defecto (`DESTINO_POR_DEFECTO`):
  cultura → viajes, música y espectáculos → eventos, aventura → naturaleza;
- `reparto_categorias.txt` lista las excepciones y las **dudosas**, con la
  regla: lo que VES o DÓNDE ESTÁS → naturaleza, HACER la actividad → deporte, el
  TÍTULO que consigues → vida.

Cada fila de `gooals.json` lleva `origen`, `categoria` y `categoria_dudosa`.
Por eso en este directorio siguen apareciendo "aventura" o "cultura": son
nombres de PDF, nunca categorías que lleguen a la base (que las rechazaría).

`insertar.mjs` usa `fetch` nativo (Node 18+) y lee `NEXT_PUBLIC_SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` de `.env.local`. No hace falta instalar nada.

Alternativa sin Node: pegar `output/<categoria>.sql` en el **SQL Editor de
Supabase**. Es un único `insert ... select ... from (values ...)` con guarda de
duplicados, así que hace lo mismo.

## El cuadre

Cada pasada imprime a dónde ha ido cada reto:

```
                 PDF  extrae  fusion  dupli  cede  final
  viajes        2000    2000                        2000
  aventura       424     424    -193           -3    228
  cultura        546     546                  -85    461
```

**`PDF` = `extrae` es lo único que valida al parser.** Si esas dos columnas no
coinciden, el script lo grita por stderr y hay que mirar el parser. Las columnas
negativas son decisiones tomadas a propósito, no retos perdidos:

- `fusion` — colapsados por `fusiones_<cat>.txt` (ver abajo)
- `dupli` — títulos repetidos dentro del propio PDF
- `cede` — copias que se lleva otra categoría, por `PRIORIDAD`

Que el total final sea menor que el que declara la portada del PDF **es lo
normal**: sobran 5.218 en los PDFs y quedan 4.931 en el catálogo. No es una fuga.

## Estructura

- `RETOS/` (en la raíz del repo) — PDFs fuente, uno por categoría
- `output/` — un `.sql` por categoría, listo para el SQL Editor
- `gooals.json` — las mismas filas en JSON; es lo que consume `insertar.mjs`
- `generar_sql.py` — parser de PDFs
- `insertar.mjs` — seeder vía API REST

## Los tres formatos de PDF

Los PDFs no siguen todos la misma plantilla, así que hay un parser por formato:

| Formato | PDFs | Línea tipo |
|---|---|---|
| A — tabla | `2000_lugares_bucket_list_mundial.pdf` | `1` / `Sagrada Familia` / `Barcelona`, bajo cabeceras de continente y país |
| B — deportivo | `bucket_list_1141_retos_deportivos.pdf` | `[ ] Completar 10 km en bicicleta    Dificultad 1/5` |
| C — ficha | aventura, cultura, gastronomía, música | `0001 [ ] Visitar el Museo del Louvre - Paris, Francia [D2]` |

Si cambias la plantilla de un PDF, el parser correspondiente
(`parse_viajes`, `parse_deporte`, `parse_fichas`) deja de cuadrar. El script
avisa cuando el número de retos extraídos no coincide con el que declara la
portada del PDF — esa discrepancia es la señal de que el formato ha cambiado.

## Dificultad y puntos

Los PDFs traen una escala 1-5; `gooals_v2` solo admite tres niveles:

| PDF | gooals_v2 | Puntos |
|---|---|---|
| D1, D2 | `facil` | 1 |
| D3, D4 | `dificil` | 5 |
| D5 | `epico` | 10 |

Encima de eso se aplica la **geografía**, en todas las categorías que traen país:
un reto lejos de casa cuesta más que el mismo reto aquí, así que la dificultad
final es la **mayor** entre la del PDF y la del destino.

| Destino | Mínimo que impone |
|---|---|
| Europa | `facil` |
| América, Asia, África | `dificil` |
| Oceanía y destinos remotos (Antártida, Nepal, Galápagos…) | `epico` |

Sin esto el catálogo salía plano: los PDFs de cultura y gastronomía marcan casi
todo D2, y "probar ramen en Tokio" acababa valiendo lo mismo que unas tapas.
`viajes` no trae dificultad ninguna, así que sale entera de esta regla. Las
listas de países están en `generar_sql.py`; amplíalas cuando se queden cortas.

Los puntos nunca se leen del PDF: salen del baremo, el mismo que aplica la app en
`src/lib/gooals.ts`. **Si cambias el baremo, hay que tocarlo en los dos sitios.**

## Limpieza que aplica el script

- **Deduplica** por título + país dentro de cada categoría. El país entra en la
  clave porque un topónimo puede estar en dos sitios: Cataratas Victoria está en
  Zambia y en Zimbabue, y son dos gooals distintos.
- **Desambigua** con el país los títulos que se repiten dentro de una categoría,
  para que en Explorar no salgan cuatro filas "Visitar Blue Lagoon" idénticas.
- **Prefija `Visitar`** en los títulos de `viajes`: el PDF da el topónimo pelado
  (`Sagrada Familia`) y el resto de categorías son frases de acción.
- **Descarta las copias entre categorías.** Un mismo sitio sale en dos PDFs
  ("Visitar Museo del Prado" está en viajes y en cultura) y es el mismo acto: con
  las dos filas se cobrarían los puntos dos veces. Gana la categoría de mayor
  prioridad (`PRIORIDAD` en `generar_sql.py`: viajes › deporte › gastronomía ›
  música › aventura › cultura). Son 90 retos, 85 de ellos viajes↔cultura.
  Solo se aplica generando las seis categorías de una pasada, no con `python
  generar_sql.py ../../RETOS musica` (un solo PDF).
- **Vacía `pais`** cuando la fuente pone un genérico en vez de un lugar
  (`Centro autorizado`, `Destino especializado`, `Rocodromo o roca`…).
- **Restituye tildes** en nombres de país y ciudad (`Espana` → `España`), que los
  PDFs de formato C traen sin acentuar. Los **títulos** se dejan tal cual vienen
  del PDF: no se adivinan tildes sobre nombres propios.

## Fusiones manuales (aventura)

Los PDFs de aventura repiten la misma actividad en distintos sitios: *Esquiar en
Chamonix / Dolomitas / St. Anton…* son 13 filas del mismo recuerdo, y con una
fila por estación se sube de nivel yendo de pista en pista. La regla que aplica
`fusiones_aventura.txt`:

> **El lugar se queda cuando ES el objetivo** (una cumbre, un trek con nombre,
> una cueva única). **Se va cuando es una sede intercambiable** (una estación,
> un spot, un circuito).

Así *Ascender el Kilimanjaro* sobrevive y *Esquiar en Laax* se funde en
*Esquiar una jornada completa en estación*, sin ciudad ni país. Son 423 → 228.

El fichero es editable a mano: una línea sin sangrar es el gooal que se queda y
las que empiezan por `<` son los que absorbe. Borra una línea `<` para que ese
reto sobreviva tal cual, o un bloque entero para deshacer el grupo.
`generar_sql.py` lo lee solo si existe; `fusiones_aventura.py` lo regenera desde
`GRUPOS`, que es la fuente de verdad.

La dificultad del gooal fusionado es la **menor** de las que absorbe: sin lugar,
el reto se puede hacer donde salga más barato.

Aventura además reescala su propia escala (`D_MAP_AVENTURA`): su PDF no baja de
D3, así que con el mapeo común la categoría se quedaba sin ningún reto de 1
punto y nadie tenía por dónde entrar. Con D3 → `facil` quedan 19 puertas de
entrada — esquiar un día, parapente en tándem, quad por dunas.

## Notas

- Los gooals entran en **`estado = 'borrador'`**: la app no los enseña hasta que
  se verifican en `/admin`. Entran con `activo = true` y sin imagen; `imagen_url`
  queda a `null` y se rellena desde el panel.
- Cada gooal entra con su **`ambito`**: `lugar` si tiene coordenadas, ciudad, o
  país en viajes/naturaleza; `personal` en el resto. La regla está repetida en
  `insertar.mjs`, `generar_sql.py` y `src/lib/gooals.ts`.
- **La dificultad no se escribe.** Aquí se usa para decidir los puntos (es lo que
  traen los PDFs), pero la base la recalcula siempre a partir de los puntos con un
  disparador. Si los puntos dicen otra cosa, mandan los puntos.
- Requiere `supabase/fase3.sql` (crea la tabla) y `supabase/fase3f.sql` (estado,
  ámbito y el disparador de la dificultad).
- `output/` está vacío a propósito: los `.sql` de antes del 15-9-2026 llevaban
  las siete categorías viejas, que la base rechaza, y se borraron. Se vuelven a
  crear con `generar_sql.py`, ya con las seis.
- Es un script **local** de siembra, como `scripts/generar-experiencias/`. No
  forma parte de la app Next.js y no se despliega en Vercel.
