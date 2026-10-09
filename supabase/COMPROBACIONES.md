# Comprobaciones hechas, con su número

Lo que se midió, cuándo, y el resultado. Está aquí porque un número dicho en una
conversación se pierde, y luego nadie sabe si aquello llegó a comprobarse.

## Las fotos del catálogo, desde fuera · 9-10-2026 · **509 de 509**

El día que el catálogo pasó de 275 fotos a **507 gooals con foto**, de 541
publicados.

```bash
node --env-file=.env.local scripts/fotos-catalogo/comprobar.mjs
```

| | |
|---|---|
| gooals con imagen | **509** (incluidas 2 filas retiradas que conservan la suya) |
| de Wikimedia Commons | 387 |
| generadas con IA | 122 |
| con foto y **sin fuente** | **0** |
| con el crédito a medias | **0** |
| apuntando fuera de nuestro almacén | 0 |
| **fotos que llegan, pedidas sin ninguna clave** | **509 de 509** |
| reintentos que hicieron falta | **0** |
| peso total | 94,2 MB · media 189 KB |

El crédito se comprueba **según la fuente**, no «las cuatro columnas siempre»:
de Commons exige autor, licencia y página; generada exige el prompt y prohíbe
autor y licencia. La misma regla está en la base
(`gooals_v2_foto_con_autor`, `supabase/fase3z.sql`) y en
`src/lib/foto-credito.ts`, que usan el panel y la API. Los tres sitios tienen
que decir lo mismo.

> **Cero reintentos sobre una tanda del doble de tamaño.** El módulo
> `scripts/lib/frenos.mjs` no tuvo que frenar ni una vez: las 509 peticiones
> pasaron a la primera. Cuando el mismo guion pidió 277 el 8-10 hubo cuatro
> frenos, así que el ritmo lento que se añadió aquel día es lo que sobra hoy y
> no al revés — no se toca.

## Las dos cerraduras, desde fuera · 8-10-2026 · **23 de 23**

Después de aplicar `supabase/fase3y.sql`, que echó la **segunda cerradura**: los
permisos por columna de `profiles` y `user_gooals`.

```bash
node --env-file=.env.local scripts/comprobar-rls.mjs
```

Hasta este día el mismo guion decía **15 de 15** mientras cualquiera con sesión
podía ponerse `es_admin = true` desde el navegador. No mentía: miraba una sola
cerradura, la de las filas. Una política decide **qué filas** tocas; un permiso
decide **qué columnas**. Ahora mira las dos, y son 23 comprobaciones.

Medido con una cuenta real creada y borrada para esto, con la clave pública:

| intento, con sesión | antes del 8-10 | ahora |
|---|---|---|
| ponerse `profiles.es_admin = true` | **lo conseguía** | rechazado (42501) |
| ponerse `profiles.puntos_totales = 9999` | **lo conseguía** | rechazado |
| ponerse `profiles.nivel = 'Leyenda'` | **lo conseguía** | rechazado |
| insertarse un gooal conseguido con 999 puntos | **lo conseguía** | rechazado |
| leer `user_gooals` | lo conseguía | rechazado |
| cambiarse el nombre (editar perfil) | funcionaba | **sigue funcionando** |

> La última fila es la mitad que importa igual que las otras: una cerradura que
> cierra de más rompe editar perfil, y eso no se ve si solo se comprueba lo que
> debe estar cerrado.

Cada intento mira **el error Y el valor**, releyendo la fila con la clave
secreta. Un `update` parado por la RLS devuelve 0 filas **sin error**; uno parado
por permisos devuelve **42501**. Confundirlos daría por cerrada una tabla
abierta, que es exactamente como esto pasó desapercibido.

> Y la primera vez que se lanzó así dio **17 de 23**, con `fase3y.sql` todavía
> sin pegar aunque se había dado por aplicado. Esa es la razón de que este
> fichero exista: el número que vale es el que sale de medir, no el que alguien
> recuerda.

## RLS, desde fuera · 7-10-2026 · **15 de 15**

Después de aplicar `supabase/fase3w.sql`, que quitó las dos últimas políticas de
lectura pública (`muro_posts · public read posts` y
`user_gooals · public read completed`).

```bash
node --env-file=.env.local scripts/comprobar-rls.mjs
```

Lo que contesta hoy la clave pública del navegador, sin sesión:

| | |
|---|---|
| perfiles | no lee ninguno |
| invitaciones_email | no las lee, ni las modifica |
| follows | no lee |
| **muro_posts** | **no lee** (antes sí: era público a propósito) |
| **user_gooals** | **no lee** (antes sí: salían las rutas de las fotos) |
| gooals_v2 | sí, solo lo verificado. Es el catálogo, y es público a propósito |

Y con sesión, esa cuenta solo ve su propia ficha: ni el correo de nadie, ni las
invitaciones de otros, ni `follows` entera.

> Las dos filas en negrita son las que cambiaron ese día. Entre el commit
> `bbd7a23` y el momento de pegar el SQL, el guion daba **13 de 15** a
> propósito: la comprobación ya exigía lo nuevo. No era una avería.

## Antes de esto

- **5-10-2026 ·** las fotos de la gente dejan de ser públicas. El cubo
  `gooals-media` se vacía y se borra; las fotos pasan a `logros-privados`, que
  es privado y solo se lee con direcciones firmadas que caducan.
- **5-10-2026 ·** `/api/proxy-image` deja de aceptar cualquier dirección. Antes
  devolvía 200 a `example.com`, a `localhost` y a direcciones internas.
