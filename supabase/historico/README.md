# SQL histórico — no se ejecuta nada de aquí

Lo que hay en esta carpeta **ya se ejecutó en su día y no se vuelve a ejecutar
nunca**. Se guarda por una razón: el registro de lo que se hizo y por qué es la
única forma de entender después cómo llegó la base a estar como está. Borrarlo
deja el repo igual de limpio y nos deja a oscuras.

Los `.sql` que sí siguen vivos están un nivel más arriba, en `supabase/`.

## De la versión 1 — las tablas ya ni existen

GooALS empezó siendo otra cosa: una app de planes en pareja. Estos cuatro
ficheros crean las tablas de aquello. **Comprobado contra Supabase el 3-10-2026:
ninguna de esas tablas existe ya** — ni `planes`, ni `plan_momentos`, ni
`plan_participantes`, ni `experiencias`, ni `gooals`, ni `gooal_lugares`, ni
`notificaciones`. Hoy la base tiene doce tablas y todas son de la fase 3.

> **No los ejecutes.** No "ponen la base al día": crearían de cero unas tablas
> vacías que nadie lee, y volvería a parecer que ahí vive algo.

| Fichero | Qué creaba |
|---|---|
| `gooals.sql` | El catálogo de la v1: `gooals` (el concepto) y `gooal_lugares` (dónde conseguirlo). Lo sustituyó `gooals_v2`. |
| `experiencias.sql` | La biblioteca de `experiencias`, curada desde el panel. Era el paso intermedio de la migración al catálogo nuevo. |
| `fase2.sql` | `plan_momentos`: las fotos del proceso de un plan, más notificaciones. Colgaba de `planes`. |
| `plan_wizard.sql` | Una columna suelta de `planes` (`fecha_plazo`), del asistente de crear un plan. |

## Limpiezas del catálogo viejo — de un solo uso, y ya usadas

Estas cuatro corregían a lo bruto el catálogo que se sembró desde los PDFs.
Siguen siendo SQL válido y apuntan a `gooals_v2`, que sí existe, así que aquí el
peligro es el contrario: **ejecutarlas hoy sí haría algo, y nada bueno.** Hablan
de un catálogo de ~4.700 filas que se retiró entero el 1-10-2026 con
`supabase/fase3l.sql`; el catálogo de hoy se escribió a mano y es otro.

| Fichero | Qué hizo, una vez |
|---|---|
| `sincronizar.sql` | Dejó Supabase igual que el fichero del catálogo: borraba todo lo que no estuviera en él. 2.184 líneas. |
| `limpiar_catalogo.sql` | El ajuste de 4.789 a 4.726 filas: retiró el PDF de música entero y movió lo que valía a otra categoría. |
| `limpiar_gastronomia.sql` | Quitó las dos coletillas que el PDF repetía en 366 de sus 598 retos ("en su contexto local" y similares). |
| `quitar_autorizado.sql` | Quitó la coletilla legal "autorizado" de los títulos, y el sitio genérico que a veces la sostenía. |

## Si alguna vez hay que mirar aquí

Para saber qué tablas hay **de verdad** hoy, no te fíes de ningún `.sql`
—incluidos los de la carpeta de arriba—: pregúntaselo a la base. Esta carpeta
nació justo de ese error.
