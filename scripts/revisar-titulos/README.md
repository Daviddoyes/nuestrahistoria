# Repaso de los títulos del catálogo

La IA lee cada título del catálogo, lo juzga con **las cinco reglas de un gooal**
(`src/lib/criterio-gooals.ts`, las mismas que salen en el panel y en CLAUDE.md) y,
cuando uno no cumple, propone otro.

**La IA no cambia nada.** Todo lo que saca se guarda en la tabla
`gooals_revision` y se decide a mano en el panel, en **dos colas separadas**:

- **Traducciones** (`/admin/gooals` → chip "Traducciones"): el gooal está bien y
  el título está mal escrito (medio en inglés, sin tildes, sin verbo). Es
  mecánico: se leen y se confirman en bloque con un botón por página.
- **Por decidir** (chip "Por decidir"): el título rompe una de las cinco reglas.
  Eso se mira de una en una y no hay botón de bloque, a propósito.

No se mezclan porque el catálogo tiene unas 1.100 traducciones y enterrarían las
decisiones de verdad.

## Antes de la primera vez

Pegar en el SQL Editor de Supabase, en este orden: `supabase/fase3k.sql`,
`supabase/fase3k-ajuste.sql` y `supabase/fase3k-traducciones.sql`. (En una
instalación nueva basta el primero: ya lleva todo dentro.) Sin la tabla, el
script se para y lo dice.

## Lanzarlo

Desde la raíz del repo:

```bash
# La muestra de 200, para ver si acierta antes de gastar el catálogo entero
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.local scripts/revisar-titulos/revisar.mjs --muestra 200

# Todo lo que quede por repasar
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.local scripts/revisar-titulos/revisar.mjs
```

Tarda un rato: va de 50 en 50 y cada tanda es una llamada a la IA.

## Se puede parar y seguir

Cada tanda se guarda al terminarla. Si se corta (Ctrl+C, se va internet, falla la
API), al volver a lanzarlo **sigue por donde iba**: lo que ya tiene fila en
`gooals_revision` no se vuelve a preguntar. Una tanda que falle tres veces se
salta y se reintenta en la siguiente pasada.

Y nunca pisa una decisión ya tomada: las filas se guardan con
`ignoreDuplicates`, así que un título que David ya aceptó o descartó se queda
como está aunque el script pase otra vez por encima.

## Opciones

| Opción | Para qué |
|---|---|
| `--muestra 200` | Repasa solo los 200 primeros que queden. Sin ella, todos. |
| `--seco` | Lo hace todo y escribe las propuestas en pantalla, **sin guardar nada**. |
| `--tanda 50` | Cuántos títulos por llamada. |
| `--modelo claude-sonnet-5` | Cambiar de modelo. Por defecto `claude-opus-5`. |
| `--esfuerzo medium` | Cuánto se lo piensa. Por defecto `low`. |

## Lo que cuesta

Medido de verdad, con tandas de 50 títulos:

- **≈ 3.000 tokens de entrada y ≈ 1.200 de salida por tanda** (12 % de los
  títulos salieron con propuesta en la prueba).
- El catálogo entero son **95 llamadas**: unos **290.000 tokens de entrada** y
  entre **120.000 y 250.000 de salida**, según cuántos títulos fallen.
- La muestra de 200 son 4 llamadas: alrededor de 12.000 de entrada y 5.000 de
  salida.

## Qué mirar cuando termine

El script imprime al final cuántos juzgó, cuántos salieron con propuesta y
**cuántas propuestas caen sobre gooals que alguien ya tiene en su perfil**. Esos
salen marcados en amarillo en el panel: cambiarles el título le cambia a alguien
lo que ve en su perfil, así que se miran con calma.
