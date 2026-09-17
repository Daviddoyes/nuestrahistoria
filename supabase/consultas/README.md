# Consultas sueltas

Consultas de **solo lectura** para revisar el catálogo desde el SQL Editor de
Supabase. No cambian nada y se pueden lanzar cuando haga falta.

| Fichero | Para qué |
|---|---|
| `candidatos-comunes.sql` | Gooals fáciles y cotidianos, repartidos por categoría: candidatos para la pantalla de Inicio o para cualquier lista corta. Marca lo que no depende de viajar y, entre los sitios, los conocidos. |
| `titulos-sospechosos.sql` | Títulos que huelen a fila mal generada (una sola palabra, cortados a mitad, repetidos, restos del PDF…). Cada fila viene con el motivo; se corrigen en `/admin/gooals`. |

Lo que sí cambia la base vive en `supabase/fase*.sql`, numerado por orden de
aplicación.
