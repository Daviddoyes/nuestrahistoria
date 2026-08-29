# Seed de Gooals

## Estructura
- pdfs/ — PDFs fuente de cada categoría
- output/ — SQL generados listos para ejecutar en Supabase
- generar_sql.py — script que convierte PDF a SQL

## Uso
```bash
python generar_sql.py pdfs/viajes.pdf viajes
python generar_sql.py pdfs/deporte.pdf deporte
```

## Categorías
- viajes (facil=1pt europa, dificil=5pts resto, epico=10pts oceanía/remoto)
- deporte (facil=1pt, dificil=5pts, epico=10pts)
- aventura (facil=1pt, dificil=5pts, epico=10pts)
- gastronomia (facil=1pt, dificil=5pts, epico=10pts)
- cultura (facil=1pt, dificil=5pts, epico=10pts)
- musica (facil=1pt, dificil=5pts, epico=10pts)

---

## Requisitos

- **Python 3.10 o superior**.
- `pip install pypdf` — el script solo necesita eso.

> El PDF tiene que llevar **texto seleccionable**. Si es un escaneo o una
> imagen exportada, no se extrae nada y el script avisa en vez de generar un
> SQL vacío.

## Formato del PDF

Un gooal por línea. Se ignoran líneas en blanco, números de página y separadores,
y se quitan las viñetas (`-`, `•`, `1.`, `1)`) del principio.

```
Ver amanecer en la playa
Bañarse en un lago de montaña
```

Opcionalmente, cada línea admite campos separados por `|`. El primero es siempre
el título; de los demás, el que sea una dificultad (`facil` / `dificil` / `epico`)
manda, y el otro se guarda como descripción:

```
Dormir en un refugio de montaña | dificil
Cruzar un glaciar a pie | epico | Crampones, cuerda y hielo hasta el horizonte
```

También puedes clasificar por bloques: una línea que contenga **solo** la palabra
de dificultad fija la de todas las líneas siguientes hasta la próxima cabecera.
Se aceptan tildes, mayúsculas, emojis y el sufijo de puntos:

```
⚡ FÁCIL
Probar un vino de la tierra
Cenar en un mercado

💎 ÉPICO — 10 pts
Comer en un restaurante con 3 estrellas
```

### Cómo se decide la dificultad

Por orden de prioridad:

1. La marca de la propia línea (`| dificil`).
2. La cabecera de bloque vigente.
3. **Solo en `viajes`:** el destino que menciona el título — Europa → `facil`,
   Oceanía o destino remoto → `epico`, el resto → `dificil`. Las listas de
   lugares están en `generar_sql.py`; amplíalas cuando se queden cortas.
4. `facil` por defecto.

En las otras cinco categorías no hay ninguna regla automática: **si el PDF no
trae cabeceras ni marcas, todo sale como `facil`.** Es deliberado — es lo que
menos desequilibra el catálogo — pero significa que un PDF sin clasificar hay
que repasarlo a mano.

Los puntos nunca se leen del PDF: salen del baremo (`facil`=1, `dificil`=5,
`epico`=10), el mismo que aplica la app en `src/lib/gooals.ts`. Si cambias el
baremo, hay que tocarlo en los dos sitios.

## Ejecutar el SQL

El fichero de `output/` se pega tal cual en el **SQL Editor de Supabase**. Cada
gooal es un `insert ... where not exists`, así que **relanzarlo no duplica nada**:
compara por título + categoría.

Requiere que `supabase/fase3.sql` (en la raíz del repo) esté ya ejecutado — es
quien crea la tabla `gooals_v2`.

Los gooals entran con `activo = true` y sin imagen; `ciudad`, `pais` e
`imagen_url` quedan a `null` y se rellenan desde `/admin` → **Catálogo Gooals V2**.

## Aviso

Es un script **local** de siembra, igual que `scripts/generar-experiencias/`.
No forma parte de la app Next.js y no se despliega en Vercel.
