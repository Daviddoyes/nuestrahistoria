# Fotos del catálogo, desde Wikimedia Commons

Herramientas **locales** para ponerle foto a los gooals. No forman parte de la
app ni se despliegan: se lanzan a mano desde el ordenador, igual que
`scripts/seed-gooals/`.

La idea de fondo, que es lo que hay que entender antes de tocar nada:

> **La máquina trae candidatas; decide una persona.** Se probaron cuatro maneras
> de elegir la foto automáticamente y ninguna pasó del 55% de aciertos, porque
> todas saben decir si es *el sitio* (coordenadas), si es *el tema* (nombre) o si
> *la hizo una cámara* (EXIF), y ninguna sabe si la foto **enseña la cosa**. Está
> contado en `CLAUDE.md`, en «Una señal hecha por personas vale más que una regla
> tuya».

## UNA FOTO CORREGIDA VA SIEMPRE CON NOMBRE NUEVO

Antes que nada, porque es lo que más fácil se hace mal:

> Al cambiar la foto de un gooal, **el fichero nuevo lleva un nombre nuevo**
> (`<id>-r2.webp`) y la fila apunta ahí. **Nunca se pisa el anterior.**

El cubo `catalogo` sirve sus fotos con `cache-control` de **un año**, porque una
dirección es una foto y no cambia nunca. Si la corregida se subiera con el mismo
nombre, los navegadores de quien ya hubiera abierto esa ficha y el CDN de
Supabase seguirían dando la equivocada **durante meses**: parecería que el cambio
no se ha aplicado, se repetiría el arreglo y seguiría sin verse.

Con nombre nuevo, la dirección cambia y no hay caché que valga. La vieja se
queda huérfana en el cubo y se borra aparte, cuando se decida — y aun entonces
su dirección puede devolver 200 un rato más, que es la caché del CDN y no un
borrado fallido.

## Después, para los casos sueltos

Una vez puestas las fotos, tres herramientas para las que están mal:

```bash
# ¿El NOMBRE del fichero suena a otro país? (una pista, instantáneo)
node --env-file=.env.local scripts/fotos-catalogo/sospechosas.mjs
#    -> "Claude outputs/fotos-sospechosas.md"

# ¿Dónde se hizo la foto DE VERDAD? (un hecho; pide las coordenadas, ~3 min)
node --env-file=.env.local scripts/fotos-catalogo/coordenadas.mjs
#    -> "Claude outputs/fotos-por-coordenadas.md"

# Cambiarle la foto a un gooal
node --env-file=.env.local scripts/fotos-catalogo/reemplazar.mjs <id> "File:Algo.jpg"
node --env-file=.env.local scripts/fotos-catalogo/reemplazar.mjs <id> "File:Algo.jpg" --escribir
```

Las dos listas son **para mirar, no diagnósticos**, y se complementan: el nombre
del fichero es una pista que vale para cualquier foto; las coordenadas son un
hecho, pero solo las traen unas 90 de las 223. Ninguna de las dos dice que una
foto esté bien: dicen dónde mirar.

`coordenadas.mjs` cuenta en voz alta **cuántas no ha podido mirar**, y el cuadre
del final tiene que sumar el total. Esa suma ya ha servido: la primera vez daban
220 de 223 y faltaban tres gooals que compartían fichero con otro.

`reemplazar.mjs` se niega a poner una foto que no traiga autor y licencia: sin
crédito no se puede usar (203 de las 223 licencias lo exigen).

## Los cuatro pasos

```bash
# 1 · Buscar cuatro candidatas por gooal (unas 2.500 peticiones, ~1 h)
node --env-file=.env.local scripts/fotos-catalogo/candidatas.mjs

# 2 · Reforzar los que salieron con candidatas genéricas (~10 min)
node --env-file=.env.local scripts/fotos-catalogo/refuerzo.mjs

# 3 · Montar la hoja para elegir (baja las miniaturas, ~10 min)
node --env-file=.env.local scripts/fotos-catalogo/hoja.mjs
#    -> se abre "Claude outputs/elegir-fotos.html" y se eligen a mano
#    -> botón "Descargar mis elecciones"

# 4 · Subir las elegidas y escribirlas en la base
node --env-file=.env.local scripts/fotos-catalogo/subir.mjs --seco
node --env-file=.env.local scripts/fotos-catalogo/subir.mjs
node --env-file=.env.local scripts/fotos-catalogo/subir.mjs --escribir

# 5 · Y comprobar que están donde la base dice que están
node --env-file=.env.local scripts/fotos-catalogo/comprobar.mjs
```

Todo lo intermedio va a `Claude outputs/`, que está gitignoreada: ahí quedan el
JSON de candidatas, las miniaturas y las hojas HTML.

## Qué hace cada uno

| Guion | Qué hace |
|---|---|
| `candidatas.mjs` | Busca **cuatro** candidatas por gooal, cada una por una vía distinta: la portada del artículo de Wikipedia por el nombre propio del gooal, la portada por el lugar, la carpeta de Commons que se llama como el gooal, y la carpeta que dice Wikidata. Guarda autor, licencia y página del original. **Se puede parar y seguir.** |
| `refuerzo.mjs` | Repasa los que salieron mal: aquellos cuyo nombre propio es solo el país o la ciudad. A «Comer una pizza napolitana en Nápoles» le tocaba la carpeta de Nápoles y salían cuatro fotos cualesquiera de la ciudad; buscando por la frase sin el verbo —"pizza napolitana en Nápoles"— sale una pizza. |
| `hoja.mjs` | Monta `elegir-fotos.html`: las cuatro candidatas por gooal más un **Ninguna**, ordenadas de más conocido a menos. Guarda lo elegido en el navegador y deja descargarlo. |
| `subir.mjs` | Baja de Commons la versión grande, la reduce a 1.600 px, la pasa a webp buscando que no pase de 300 KB y la sube al cubo `catalogo`. Con `--escribir`, pone en `gooals_v2` la dirección de **nuestra** copia y las tres columnas del crédito. |
| `comprobar.mjs` | Lee `gooals_v2` y le pide cada foto a Supabase **sin ninguna clave**, como haría el móvil de cualquiera. Monta `fotos-en-produccion.html` con las direcciones reales: si una no está donde la base dice, su recuadro sale en rojo. |

## Cosas que conviene saber

**Las cuatro columnas van juntas o no van.** `imagen_url`, `foto_autor`,
`foto_licencia` y `foto_origen`. De las 223 primeras fotos, **203 exigen citar al
autor**: es la condición de poder usarlas. Una foto sin su crédito no se puede
publicar, así que `comprobar.mjs` avisa si alguna fila quedó a medias.

**La copia es nuestra, a propósito.** `imagen_url` apunta al cubo `catalogo` de
Supabase, nunca a Commons: un enlace a Commons se rompe el día que allí borren o
renombren la foto, y nadie se entera. `foto_origen` guarda la página de Commons
para el crédito y para poder comprobar la licencia.

**El cubo `catalogo` es solo del catálogo.** Lectura pública, cero políticas de
escritura. **Las fotos que sube la gente no van ahí jamás** — van a
`gooals-media`, que es privado. El porqué está en `supabase/politicas.sql`.

**`sharp` viene de Next, no está declarado.** `subir.mjs` lo usa para reducir y
convertir. Si algún día `npm install` lo deja fuera, falla al cargarlo; se
instala con `npm i -D sharp`.

**Se piden las cosas despacio.** Wikimedia pide identificarse y no le gustan las
ráfagas: una petición por segundo y un User-Agent con la web del proyecto. No lo
bajes.

## Lo que queda pendiente

- **107 gooals sin foto**, de los 330 decididos. La siguiente pasada tiene que
  buscar **la acción** en vez del sitio: «Bañarte en una playa de arena negra de
  Santorini» no se arregla buscando Santorini.
- **La cerradura de la base**: una restricción que impida guardar `imagen_url`
  sin `foto_autor`. Está escrita y comentada al final de `supabase/fase3r.sql`.
  No se pone hasta que el panel tenga campos para el autor y la licencia, porque
  si no, crear un gooal con foto desde el panel empezaría a fallar.
- **Enseñar el crédito en la app.** Hoy el autor y la licencia están guardados
  pero no se ven en ninguna pantalla, y 203 de 223 obligan a citarlos.
