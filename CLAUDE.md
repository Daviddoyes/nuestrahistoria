@AGENTS.md

# GooALS

App de retos ("gooals") con muro social, puntos y seguidores. Next.js 16 + React
19 + Supabase, desplegada en Vercel bajo gooals.app.

La app es gratuita. No hay pasarela de pago.

El repo se llama `nuestrahistoria` por razones históricas: el producto es GooALS.

## Antes de tocar nada

Este proyecto lo lleva alguien que **no es programador**. Eso cambia dos cosas:

1. **Explica en lenguaje llano, no en jerga.** "La app se trae 1.000 filas y
   filtra en el navegador" se entiende; "el límite por defecto de PostgREST"
   no, salvo que lo acompañes.
2. **No des por hecho que puede ejecutar cosas.** Da el comando entero, listo
   para copiar, y di qué debería ver al ejecutarlo.

## Arquitectura

```
src/app/          rutas (App Router). Casi todas son componentes de cliente.
src/components/   UI. admin/ son las secciones del panel.
src/lib/          lógica compartida
src/types/        tipos. Solo gooals.ts; planes.ts era de la v1 y ya no está.
supabase/*.sql    esquema. NO se ejecuta solo: se pega en el SQL Editor.
supabase/historico/  lo que ya se ejecutó y no se repite. Solo registro.
scripts/          herramientas locales de siembra. No forman parte de la app.
RETOS/            los PDFs fuente del catálogo.
```

### Clientes de Supabase — hay tres y no son intercambiables

| Módulo | Cuándo |
|---|---|
| `@/lib/supabase/client` | Componentes de cliente (`'use client'`). Lleva PKCE, que es lo que hace funcionar el login por enlace. |
| `@/lib/supabase/server` | Server Actions y rutas que necesitan **la sesión del usuario**. Lee las cookies. |
| `@/lib/supabase/service` | Service role. Salta la RLS. Solo en servidor, nunca importado desde un `'use client'`. |

Hubo un tiempo en que había cinco módulos, tres de ellos casi iguales. Si ves
`@/lib/supabase-server`, `@/lib/supabase-browser` o `@/lib/supabase` en algún
sitio, es código viejo: ya no existen.

### La RLS es deliberadamente restrictiva

**Las políticas viven en `supabase/politicas.sql`, y ese fichero es la verdad.**
Si la base y ese fichero no coinciden, uno de los dos está mal. Nació de un
agujero real: alguien añadió a mano una política de lectura en `profiles` desde
el panel, se quedó, y durante meses cualquiera con la clave pública del
navegador podía leer los 53 correos. El repo no lo contaba porque no lo sabía.

Tres cosas que hay que saber antes de tocar una política:

1. **Una política NO concede permisos, solo los limita.** `anon` y
   `authenticated` tienen todos los permisos en casi todas las tablas (el
   reparto por defecto de Supabase), así que en casi todas **la RLS es la única
   cerradura**: cualquier política permisiva que se añada abre la tabla al
   instante. Las excepciones son `profiles` y `user_gooals`, que desde el
   8-10-2026 tienen además permisos por columna — ver
   «[La RLS decide filas; los permisos deciden columnas](#la-rls-decide-filas-los-permisos-deciden-columnas)».
2. **Las políticas del mismo tipo se suman con O.** Basta UNA que diga `true`
   para que las demás no sirvan de nada. Así se abrió `profiles`: la ancha
   convivía con la correcta y la anulaba.
3. **Una tabla sin políticas está cerrada, y eso es lo correcto** para lo que
   solo toca el servidor. No es un olvido; no le añadas una "para que funcione".

Para comprobarlo desde fuera, que es la única forma de creérselo:
`node --env-file=.env.local scripts/comprobar-rls.mjs`


Solo `gooals_v2` tiene lectura pública. Todo lo demás se lee y escribe con el
service role desde el servidor. **No se crean políticas de RLS a propósito**:
así la anon key —que es pública— no puede insertar likes, follows ni posts en
nombre de nadie. Si algo "no se puede leer desde el cliente", suele ser eso, y
la solución es una Server Action, no una política nueva.

### Administración

`/admin` exige sesión (en `src/proxy.ts`) **y** que `profiles.es_admin` sea
`true`, que se comprueba en el servidor con `esAdmin()` de `@/lib/admin-auth`.

El panel son cuatro pestañas, una ruta cada una: `/admin/gooals` (abre por
defecto), `/admin/usuarios`, `/admin/metricas` y `/admin/comunicaciones`.
`src/app/admin/layout.tsx` comprueba el permiso y pinta las pestañas, pero **eso
solo decide qué se pinta**: un layout no se repite al cambiar de pestaña. Cada
página que lee datos, cada ruta bajo `/api/admin/` y cada Server Action vuelve a
llamar a `esAdmin()` por su cuenta.

**Comunicaciones manda correos reales.** El freno está repetido en el servidor
(`src/app/admin/comunicaciones/acciones.ts`), no solo en la pantalla: solo se
envía el texto exacto de la última prueba, hay que escribir ENVIAR, la cifra
confirmada tiene que coincidir con la de ese momento y una campaña pasa de
`borrador` a `enviando` una sola vez. El índice único `(user_id, campana)` de
`emails_enviados` y la clave de idempotencia de Resend impiden que a nadie le
llegue dos veces, también al reanudar un envío cortado. Todo correo lleva
`enlaceBaja()` de `src/lib/email-baja.ts`.

Nunca metas una contraseña de admin en un componente de cliente: el bundle es
público. Esto ya pasó una vez y expuso el email de todos los usuarios.

## Reglas del dominio

### La dificultad sale de los puntos

Los puntos van de 1 a 10 y la dificultad **no se escribe nunca**: se deduce.
`1-3 facil` · `4-7 dificil` · `8-10 epico`

Esa tabla vive en TRES sitios y tienen que coincidir:

- `src/lib/gooals.ts` → `BANDA_PUNTOS` y `dificultadDePuntos()`, lo que usa la app
- `scripts/seed-gooals/generar_sql.py` → `BANDA`, lo que se siembra
- `supabase/fase3f.sql` → el disparador que la recalcula en la base

Aunque algo escribiera una dificultad, el disparador la pisa con la de los
puntos. Los puntos se guardan en la fila de `gooals_v2` a propósito: así un
cambio de baremo no reescribe el histórico de puntos ya ganados.

### Los puntos ganados se congelan, y rehacerlos es un acto deliberado

Decidido el 8-10-2026, después de proponer lo contrario y medirlo.

Cuando alguien consigue un gooal, sus puntos **se copian** a
`user_gooals.puntos_ganados` ([actions.ts](../src/lib/actions.ts), en
`conseguirSinFoto` y `completarGooal`) y de ahí salen todas las sumas. El
catálogo **no se vuelve a mirar nunca**: ni al pintar el perfil, ni en Inicio,
ni al recalcular `profiles.puntos_totales`.

Es la misma razón por la que `gooals_v2.puntos` vive en la fila y no en una
tabla de baremos, y está escrita al lado de la suma del perfil. Aquí queda el
porqué, para que no se vuelva a proponer:

> **Un gooal conseguido es un recuerdo, no una posición en una tabla.** Quien lo
> hizo cuando valía 8 lo hizo con las reglas de ese día.

Y el motivo práctico, que es el que lo cierra: leer los puntos del catálogo al
sumar convertiría **cada corrección de baremo en un cambio silencioso del
marcador de todo el mundo**. No es hipotético — el 8-10-2026, en una tarde, «Hacer
una vía ferrata» pasó de 5 a 3 y «Recorrer un GR entero» de 4 a 8. Con los
puntos en vivo, eso le habría movido el total a cualquiera que los tuviera, sin
que nadie lo pidiera y sin que apareciera en ningún sitio.

Cuando un baremo esté mal de verdad y haya que rehacer el histórico, se hace con
**un guion aparte, que se lanza a propósito y se avisa**. Deliberado, nunca
efecto secundario.

Y la consecuencia para la seguridad, que es lo que hay que tener delante al
tocar la RLS: **como la copia se queda, la protección no puede ser «no hay nada
que falsear».** Tiene que ser que esa columna **solo la escriba el servidor**.

### Solo se ve lo verificado, pero lo de cada uno es suyo

`gooals_v2.estado` es `borrador` o `verificado`. **Todo lo que enseña el catálogo**
(Explorar, búsqueda, mapa, detalle, onboarding) filtra por `verificado`. El panel
de admin es la excepción: ve todo.

**El perfil y el muro NO filtran por estado, a propósito.** Lo que alguien ya ha
añadido o conquistado es suyo aunque el gooal pase a borrador. Hay un comentario
en cada una de esas consultas; no lo "arregles".

Nacen `verificado`: aprobar una sugerencia y crear uno a mano en el panel.
Nacen `borrador`: el pipeline de siembra, "Generar con IA" y la importación CSV
(`/admin/gooals/importar`).

### Las cinco reglas de un gooal

Esto es **el criterio editorial del catálogo**: lo que separa un gooal bueno de
uno que hay que reescribir. Sale de corregir a mano cientos de títulos malos.

El texto exacto vive en un solo sitio, `src/lib/criterio-gooals.ts`
(`REGLAS_GOOAL` y `PRINCIPIO_GOOAL`). Lo de aquí abajo es una copia para leer;
**si el criterio cambia, se cambia en ese fichero**, y el prompt de la IA y el
recordatorio del panel cambian solos.

1. **La prueba de la foto.** ¿Qué foto demuestra esto? Si esa foto podría ser de
   otras cincuenta cosas, el título está mal.
   MAL: «Probar un plato que no sabías pronunciar» · BIEN: «Comerte un escorpión»
   *Matiz, en comida:* la línea está **dentro del plato**, no en la forma del
   título. Vale lo raro, lo extremo o lo difícil de conseguir (escorpión, fugu,
   casu marzu, hormigas culonas); no vale la comida corriente de otro país por
   muy extranjera que sea (currywurst, gyros, soba). La pregunta es si eso se lo
   come cualquiera un martes en ese país o es una rareza. Y ojo: la regla 1 **no**
   pregunta si el gooal es impresionante, sino si la foto es inconfundible.
2. **Concreto, nunca una categoría.** Una cosa que se hace, no un grupo de cosas.
   MAL: «Probar un deporte que no habías practicado nunca» · BIEN: «Practicar pádel»
3. **Si hay un sitio con nombre, el sitio es el gooal.** Cuando la gracia está en
   el lugar, el lugar va en el título con su nombre.
   MAL: «Desayunar en un mercado» · BIEN: «Visitar el mercado de la Boqueria»
4. **Sin coletillas de condición.** Nada de "durante 30 días", "delante de
   desconocidos" o "de más de dos metros".
   MAL: «Cantar en un karaoke delante de desconocidos» · BIEN: «Cantar en un karaoke»
5. **El logro nombrable, no el proceso.** Lo que se consigue y se puede decir en
   voz alta, no el camino.
   MAL: «Aprender un idioma hasta poder conversar» · BIEN: «Sacarse el C1 de inglés»

Y por encima de las cinco:

> Un gooal tiene que ser **MEMORABLE, no fácil**. Que dos personas hayan
> aprendido a nadar no las conecta; que las dos hayan hecho el Camino, un 10K o
> una carrera universitaria, sí. **No se baja el listón para llenar perfiles.**

Quién lo aplica hoy:

- **"Generar con IA"** (`src/app/api/admin/generar-gooals/route.ts`) mete las
  cinco reglas en el prompt con `criterioParaPrompt()`.
- **El panel**, al crear o corregir a mano, las enseña con
  `<RecordatorioCriterio />` (`src/components/admin/RecordatorioCriterio.tsx`):
  crear un gooal, generar con IA, la lista de trabajo y aprobar sugerencias.
- **No hay validador automático, a propósito.** Un título malo casi nunca lo es
  por la forma, sino por el sentido: una regla automática rechazaría buenos y
  dejaría pasar malos. Decide una persona.

Para encontrar los que ya están mal en el catálogo:
`supabase/consultas/titulos-sospechosos.sql` (la vía rápida, solo SQL) y el
**repaso con IA**: `scripts/revisar-titulos/` juzga cada título con estas reglas
y deja una propuesta en la tabla `gooals_revision` (`supabase/fase3k.sql`). La IA
no cambia nunca un título: solo propone, y decide David en `/admin/gooals`, en
dos colas que **no se mezclan**: "Traducciones" (el título está mal escrito; es
mecánico y se confirma en bloque) y "Por decidir" (rompe una regla; una a una,
sin botón de bloque a propósito). Es un trabajo temporal; cuando acabe, la
tabla se borra y el panel sigue funcionando sin ella.

### Un gooal es una experiencia, no un sitio

Un gooal debe ser algo distinto de hacer, no la misma actividad en otro lugar.
"Esquiar en Laax" y "Esquiar en Andorra" son el mismo recuerdo y darían puntos
dos veces, así que el catálogo los tiene fundidos en "Esquiar una jornada
completa en estación", sin ciudad ni país.

La regla, para cuando haya que decidir sobre uno nuevo:

> **El lugar se queda cuando ES el objetivo** (una cumbre, un trek con nombre,
> una cueva única). **Se va cuando es una sede intercambiable** (una estación,
> un spot, un circuito).

Por eso `viajes` lleva lugar en todas sus filas y `deporte` no lo lleva en
ninguna.

#### Y el matiz, que costó casi 74 gooals

Hay una regla hermana para las fotos —«la foto ilustra **la acción**, no el
lugar»— y nació de un caso real: «Subir en bici al Angliru» es una bici
subiendo, no la montaña. Ahí **subir no es estar**, y la foto del puerto vacío
no cuenta el gooal.

Pero esa regla, aplicada a ciegas, se lleva por delante media categoría. En
«Visitar la Alhambra» **el verbo ES estar allí**: el lugar no es el decorado, es
la acción entera. Un encuadre cerrado sobre «alguien visitando» no dice nada, y
sin el sitio no queda gooal.

> **Antes de aplicar «la acción, no el lugar», pregúntate si el verbo es ESTAR.**
> Si lo es —visitar, ver, pasear, cruzar, bañarse en un sitio con nombre—, el
> lugar **es** la acción y la foto tiene que enseñarlo. Si no lo es —subir,
> correr, escalar, recorrer—, manda la acción.

Esto pasó el 8-10-2026 y casi cuesta caro: al preparar las fotos generadas con
IA se clasificaron los 266 gooals sin foto y **217 llevaban un sitio concreto**.
Aplicando la regla sin el matiz, 74 se iban a quedar sin foto para siempre
—«Visitar el Coliseo», «Ver la Alhambra», «Cruzar el cruce de Shibuya»— cuando
de todos ellos hay fotos de sobra y buenas en Wikimedia Commons.

Y el porqué de fondo, que es lo que hay que recordar: **Commons se quedó corto
buscando ACCIONES, no buscando sitios.** Es un archivo de fotos de lugares.
Cuando la lista que tienes delante son lugares con nombre, la fuente correcta
sigue siendo Commons, y la IA es para lo que Commons no tiene: gente haciendo
cosas.

### Un gooal sin foto no está incompleto si tiene sitio

Esto va a volver a salir cada vez que se mire el catálogo buscando huecos, así
que queda escrito: **un gooal sin foto no está incompleto si tiene sitio.**

Hay dos clases de gooal y se encuentran por caminos distintos:

- El **genérico** («Practicar pádel», «Correr un maratón») no tiene
  coordenadas, así que al mapa no sale. Su manera de aparecer es **Descubrir**,
  y Descubrir es una tarjeta: necesita foto.
- El **concreto** («Hacer la ferrata de Boixadera dels Bancs») tiene
  coordenadas. Se encuentra **por el mapa y por el buscador**, que no piden
  foto ninguna.

**Ninguna pantalla pide las dos cosas a la vez.** De ahí la regla, que ya aplica
`scripts/fotos-catalogo/elegir-accion.mjs`: si un genérico y un concreto quieren
la misma foto, **se la queda el genérico** y el concreto se queda sin ella. No
es una pérdida: la foto de la Marató de Barcelona, con el Arc de Triomf detrás,
no puede ilustrar la Mitja de Granollers, y los primeros usuarios son catalanes
y lo verían al instante.

Y el corolario, que es lo que evita el trabajo inútil: **cuando falta un
genérico, lo que falta es el genérico, no la foto del concreto.** Por eso se
crearon los cinco padres de deporte (vía ferrata, media maratón, maratón,
dosmil, GR) en lugar de fundir los concretos entre sí. Fundirlos habría borrado
sitios reales que el mapa sabe enseñar.

### Seis categorías, y la base no acepta otras

`viajes · naturaleza · eventos · deporte · gastronomia · vida`. Hubo siete
(con `cultura`, `musica`, `aventura` y `espectaculos`); se repartieron el
15-9-2026 con `supabase/fase3g.sql`, y desde entonces la restricción
`gooals_v2_categoria_valida` rechaza cualquier otro nombre.

La regla para decidir la categoría de un gooal:

> Lo que **VES** o **DÓNDE ESTÁS** → `naturaleza`. **HACER** la actividad →
> `deporte`. El **TÍTULO** que consigues (cursos, certificaciones) → `vida`.

Las categorías viven en `src/lib/gooals.ts` (nombre, color, degradado e icono
de lucide), y hay copias en `scripts/seed-gooals/insertar.mjs` y
`generar_sql.py`. `categoria_dudosa = true` marca los que la regla no tenía
claros: llevan la mejor apuesta, se ven igual y se repasan en el panel con el
filtro "Categoría dudosa".

`profiles.intereses` NO usa estos nombres: guarda los intereses del onboarding
(`viajes`, `gastronomia`, `musica`, `deporte`, `cultura`), que son otra lista.

### El catálogo tiene menos retos que los PDFs, y está bien

Los PDFs declaran 5.218; en `gooals_v2` hay 4.726. **No es una fuga.** Se
descartan por tres motivos, y `generar_sql.py` imprime un cuadre que dice
exactamente cuántos por cada uno:

- fusiones (`scripts/seed-gooals/fusiones_aventura.txt`)
- títulos repetidos dentro del propio PDF
- copias que se lleva otra categoría (un sitio está en dos PDFs y daría puntos
  dos veces)

Los PDFs siguen llegando con las siete categorías viejas: en el pipeline son el
**origen** de cada reto, no su categoría. `generar_sql.py` reparte al final en
las seis con `scripts/seed-gooals/reparto_categorias.txt`.

Lo único que valida al parser es que las columnas `PDF` y `extrae` del cuadre
coincidan. Si no coinciden, el script lo avisa por stderr.

Esto ya ha generado dos falsas alarmas. Antes de reportar que "faltan retos",
mira el cuadre.

## Comandos

Está todo en `COMANDOS.md`, en la raíz. Lo esencial:

```bash
npm run dev                              # arranca en localhost:3000
npx tsc --noEmit && npm run lint && npm run build   # antes de publicar
```

El catálogo, desde `scripts/seed-gooals/`:

```bash
python generar_sql.py ../../RETOS
node insertar.mjs --dry-run
node insertar.mjs
```

`insertar.mjs` es idempotente pero **solo añade, nunca borra**: para rehacer una
categoría hay que vaciarla antes en Supabase, comprobando primero que nadie la
tenga en su lista (`user_gooals` tiene `on delete cascade`).

## No se borra nada del proyecto sin avisar

Y tampoco se matan procesos en el ordenador de David sin avisar. Las dos salen
del mismo día.

**Dentro de la carpeta del proyecto no se borra nada.** Ni ficheros suyos, ni
los tuyos de prueba, ni capturas, ni scripts sueltos. Si algo sobra: se mueve a
una carpeta aparte, se dice cuál es, y lo borra él. Da igual que estés
segurísimo de que ese fichero es tuyo.

**Fuera del proyecto, borra con rutas absolutas. Siempre.** Y nunca encadenado
detrás de algo que puede fallar a medias.

El día que se escribió esto, una línea así se llevó por delante el arnés de
pruebas:

```bash
cd /una/carpeta && node algo.mjs && cd /otra && cp ... ; rm -f navegador.mjs
```

El `node` falló, así que el `&&` cortó la cadena y el segundo `cd` nunca llegó a
ejecutarse — pero el `rm`, detrás de un `;`, se ejecutó igual **desde la primera
carpeta**. Borró los ficheros equivocados. Esa vez solo era un arnés de pruebas
de media hora; en la carpeta del catálogo habrían sido tres semanas.

**Y los procesos: se avisa antes de matar ninguno.** Aunque los hayas lanzado
tú. Quedaron 308 procesos de Edge de las pruebas comiendo memoria y estuvo bien
verlo, pero quien decide qué se cierra en su ordenador es él: desde fuera no se
distingue un navegador de pruebas de uno con doce pestañas abiertas y trabajo
sin guardar.

### Un permiso para UNA cosa no es un permiso para su categoría

La regla de arriba se cumplió y aun así salió mal, así que aquí está la que sí
cubre lo que pasó el 9-10-2026.

Se preguntó por un Edge huérfano que ocupaba el puerto 9222. David contestó
«ciérralo». Al ir a cerrarlo había **579 procesos de Edge**, todos del arnés de
pruebas. Se cerraron los 579 y se contó después.

> **Si al ir a hacer lo autorizado te encuentras con algo distinto de lo que
> preguntaste, eso es una pregunta nueva, no la misma con otro número.** Se
> para y se vuelve a preguntar, aunque la respuesta parezca obvia y aunque todo
> lo que vayas a tocar sea tuyo.

Uno convirtiéndose en 579 es un cambio de categoría, no de cantidad: lo
autorizado era un proceso suelto y lo que había era una limpieza de la máquina
entera. La respuesta correcta cabía en una línea —«he ido a cerrar el del 9222
y hay 579, todos de mi arnés; ¿los cierro?»— y costaba treinta segundos que
estaban disponibles.

Y la señal para reconocerlo: **no es «¿tengo permiso?», es «¿lo que estoy
mirando es lo que describí al pedirlo?»**. Si la respuesta es no, da igual lo
seguro que estés del sí.

## Una señal hecha por personas vale más que una regla tuya

Sale de buscar fotos para el catálogo en Wikipedia, y es general.

Se probaron cuatro maneras de elegir la foto de un gooal. Una de ellas era
coger **la imagen de portada del artículo de Wikipedia**. Las otras tres eran
reglas cada vez más finas: que el fichero no se llame "flag" ni "map", que el
nombre comparta palabras con el gooal, que la imagen tenga datos EXIF de cámara.

La regla del EXIF parecía la más sólida —una foto la hace una cámara, un plano
escaneado no— y **empeoró el resultado**: tiró la fachada del Museo del Prado,
que no lleva datos de cámara, y la cambió por un cuadro de dentro del museo.

El motivo es que la portada de un artículo **la eligió una persona** para
representar ese artículo. Eso ya contiene el juicio que ninguna regla sabe
emitir. Las reglas sabían decir si era el sitio (coordenadas), si era el tema
(nombre) y si la hizo una cámara (EXIF); **ninguna sabía si la foto enseña la
cosa**, que era justo la pregunta.

La regla, para la próxima:

> Antes de escribir una heurística, mira si alguien ya ha hecho ese juicio y lo
> ha dejado en algún sitio: una portada elegida a mano, una categoría curada,
> una lista de "imágenes destacadas", un campo que alguien rellenó. Esa señal
> suele ganarle a la regla, y además no se rompe de maneras raras.

Y su reverso, que es lo que pasó aquí cuatro veces: **cada heurística nueva
arregla unos casos y rompe otros**, porque es un sustituto de un juicio que no
sabe hacer. Si se van encadenando, el número automático sube y el real no: la
primera ronda decía 19 de 20 y eran 10. Cuando eso pasa, la respuesta no es otra
heurística — es traer candidatas y que decida una persona.

## No hay un orden que acierte siempre

Sale de elegir las fotos de los gooals de acción, y es hermana de la de arriba.

El primer orden de preferencia entre estrategias era a ojo y dio **44 fotos
buenas de 123 propuestas**. Se midió cuál acertaba más mirándolas una a una, se
reordenó por ese dato y subieron a **54**. Mejor, y el orden medido se quedó.

Pero al mirar las que habían cambiado, **dos de las que ya estaban bien se
habían roto**: el orden nuevo acertaba con «Practicar pádel» (la vieja traía un
organigrama) y fallaba con la Cursa dels Bombers, que la vieja acertaba con el
arco de salida. Ningún orden acierta siempre, porque el orden es un sustituto
del juicio que no sabe hacer.

De ahí dos cosas:

1. **El registro guarda la propuesta aprobada de la vuelta que sea**, no la de
   la última vuelta. Es lo que hace `Claude outputs/fotos-accion-final.json`:
   mezcla las dos revisiones y de cada gooal se queda la foto que pasó el ojo,
   venga del orden viejo o del nuevo.
2. **Una mejora en el total puede esconder un empeoramiento.** 44 → 54 es +10
   limpio en el resumen, y dentro había dos retrocesos. Si solo se mira el
   número de arriba, no se ven: hay que mirar **las que cambian**, que suelen
   ser pocas, y no volver a juzgar las que no.

## Commons tiene sitios y objetos, no gente haciendo cosas

Y esto es lo que la segunda pasada demostró de verdad, con los números.

De **146 gooals de acción** (deporte, gastronomía y vida) se aprobaron **54
fotos**. Dónde cayeron los 92 que vuelven de vacío:

| | con foto | sin foto |
|---|---|---|
| genéricos («Practicar vela») | 31 | **29** |
| con nombre propio («Subir al Matagalls») | 23 | 63 |

De los 92 sin foto, 70 tenían candidatas que **se miraron y no enseñaban lo que
dice el título**, y 22 no tenían ninguna candidata.

Lo importante es el 29. **Entre los genéricos que vuelven sin foto están padres
que YA existían**: «Correr un 10K», «Hacer cumbre en un cuatromil», «Practicar
esquí», «Saltar en paracaídas», «Bailar salsa», «Cantar en un karaoke», «Probar
el fugu», «Montar tu propia empresa». No es que falten padres: es que de esos
padres Commons no tiene foto, porque Commons documenta **sitios y objetos**, no
gente haciendo cosas. Hay mil fotos del Matagalls y ninguna de alguien subiendo.

> **Crear más padres genéricos no arregla Descubrir.** Eso es un problema de
> **fuente**, y se decide aparte: otra fuente de imágenes, una foto encargada, o
> que Descubrir sepa pintar una tarjeta sin foto (que ya lo sabe, más estrecha).

Las estrategias que de verdad sostuvieron las 54, por si hay que volver a esto:
**33 la portada del artículo**, 14 la carpeta de Commons, 6 Commons en español y
1 la carpeta del nombre propio. La portada otra vez la primera — la eligió una
persona, que es lo que dice la sección de arriba.

## Si cambia el SIGNIFICADO, cambia el NOMBRE

Es hermana de la de aquí abajo, y sale del día que un gooal pasó de tener dos
estados a tener tres.

Cuando un campo pasa a querer decir otra cosa, hay que ir a todos los sitios que
lo leen. El problema es que **el ordenador no avisa de ninguno**: se midió, y al
ampliar el tipo de los estados de dos valores a tres dio **cero errores**. Todo
seguía compilando y todo seguía pintando números; solo que algunos eran falsos.

La forma de que el ordenador sí avise es **renombrar el campo**. Entonces deja de
existir el viejo, y cada sitio que lo lee se convierte en un error que hay que
visitar a mano. El renombrado no es cosmético: es la herramienta que convierte
una búsqueda a ojo en una lista cerrada.

El caso que lo demuestra: `ConteoCategoria.conquistados` pasó a contar también
los vividos. Se renombró a `hechos`, y eso destapó `CompartirPerfilStory`, la
imagen que se comparte en Stories, que no estaba en la lista de sitios a revisar.
**Una imagen no da errores**: habría seguido dibujando el número equivocado para
siempre, y nadie lo habría notado nunca porque no hay nada que mirar.

En la práctica:

1. **Primero renombra, luego cambia el significado.** Al revés, el compilador ya
   no tiene nada de lo que tirar.
2. **El nombre nuevo dice lo que el campo quiere decir AHORA**, no de dónde
   viene: `hechos` y no `conquistadosYVividos`.
3. **Lo que no se puede renombrar, se escribe.** Una columna de la base es una
   migración y a veces no compensa: `gooals_v2.veces_completado` cuenta hoy
   vividos y conquistados y conserva el nombre viejo a propósito. Cuando se
   decide eso, la razón va en un comentario donde se lee la columna, porque esa
   es la única señal que va a quedar.

## La RLS decide filas; los permisos deciden columnas

Son dos cerraduras distintas y hay que mirar las dos. Esto costó un agujero que
estuvo abierto desde el primer día y que **ninguna revisión de políticas podía
encontrar, porque las políticas estaban bien**.

La RLS de `profiles` era correcta y sigue siéndolo: `using (auth.uid() = id)`,
cada uno toca su fila y nada más. El problema es que **tu propia fila incluye tu
propio `es_admin`**. Y como `anon` y `authenticated` tenían todos los permisos
sobre todas las columnas, bastaba una petición desde el navegador —con la clave
pública, que va en el bundle— para hacerse administrador de `/admin`, que lee el
correo de los 53 usuarios. `puntos_totales` y `nivel` iban por el mismo camino.

> **Una política de RLS no sabe nada de columnas.** No hay forma de escribir una
> que diga «esta fila sí, pero esa columna no». Eso se hace con un `GRANT` por
> columna, que es otra cosa y se mira en otro sitio.

Cómo mirar las dos, que es lo único que hay que recordar:

- **Las filas** se miran en `pg_policies`: el `USING` dice qué filas ves o
  tocas, el `WITH CHECK` qué puedes dejar escrito. (Matiz que confunde siempre:
  en `FOR ALL` y `FOR UPDATE`, si no hay `WITH CHECK`, Postgres reutiliza el
  `USING`. En `FOR INSERT` no: sin `WITH CHECK` no se inserta nada.)
- **Las columnas** se miran con `has_column_privilege('authenticated',
  'public.tabla', 'columna', 'UPDATE')`. Hay una consulta que lo saca todo junto
  en `supabase/consultas/cerradura-puntos.sql`.

Y la pregunta que hay que hacerse ante cualquier tabla con una política de
escritura propia: **¿qué columnas de MI fila no debería poder escribir yo?**
Normalmente son las que lleva la cuenta de algo (`puntos_totales`, `seguidores`)
y las que dan permisos (`es_admin`). Si alguna de esas está en una tabla que el
navegador escribe, la política correcta no basta.

Lo que quedó echado el 8-10-2026 está en `supabase/politicas.sql`, al final, y
se aplicó con `supabase/fase3y.sql`. El criterio del reparto:

> Al navegador se le devuelve permiso **solo sobre las columnas que escribe de
> verdad**, leídas de los sitios del código que las escriben — nunca de memoria.
> Una columna nueva nace cerrada, que es el lado bueno: si algún día hace falta
> escribirla desde el navegador, falla en cuanto se prueba y se añade a la lista.

## A veces no hay que medir: basta con mirar qué sería imposible

Al cerrar los permisos de `profiles` (8-10-2026) había una pregunta que daba
miedo, porque romper el registro es peor que el agujero: **si a `anon` se le
quita el permiso de insertar, ¿deja de funcionar el alta?**

Lo que parecía tocaba era probarlo. No hizo falta, y el razonamiento es mejor
que la prueba:

> El alta inserta en `profiles`, y la política de insert de esa tabla exige
> `auth.uid() = id`. **`anon` no tiene uid.** Así que si el alta estuviera
> corriendo como `anon`, ya estaría fallando **desde antes de este cambio**. Y
> no falla. Luego no corre como `anon`, y quitarle el permiso a `anon` no puede
> romperla.

Una prueba demuestra que funcionó una vez, en un sitio, con un camino. Esto
demuestra que **no puede ser de otra manera**, y de paso explica por qué.

La forma de buscarlo, que sirve para cualquier miedo parecido:

> **Si lo que temo fuera verdad, ¿qué MÁS estaría pasando ahora mismo? ¿Lo estoy
> viendo?** Si la consecuencia sería visible y no se ve, la premisa es falsa y
> no hace falta montar nada.

Y el límite, que es la otra mitad y hay que tenerlo delante: **el razonamiento
vale lo que valga su premisa.** Aquí la premisa es doble —que la política es la
que está escrita, y que el alta funciona hoy— y las dos son comprobables. Si
alguna dejara de ser verdad, el argumento se cae **sin avisar**, igual que una
razón escrita que caduca. Por eso la premisa se escribe al lado de la
conclusión, no se deja en la cabeza de nadie.

El mismo día dio el contraejemplo, por si hacía falta: se dio por aplicada una
migración porque alguien dijo que la había pegado, y al medirlo desde fuera el
agujero seguía abierto. **«Está hecho» no es una premisa comprobable; «el alta
funciona» sí.** La diferencia entre las dos es exactamente la que separa este
razonamiento de una suposición.

## Un título tiene sujeto y complemento, y se busca por el sujeto

Nueve fallos de nueve, una sola causa. Sale de buscar fotos de lugares en
Commons, y vale para cualquier cosa que se busque a partir del título de un
gooal.

**«Ver la Alhambra desde el Mirador de San Nicolás»** tiene un sujeto —la
Alhambra— y un complemento —desde dónde se ve—. El buscador se quedó con el
complemento y trajo cuatro fotos de la iglesia de San Nicolás y del muro del
mirador. La Alhambra no salía en ninguna.

Lo mismo, cuatro veces más:

| el título dice | el buscador buscó | y trajo |
|---|---|---|
| el salar de **Uyuni** | el pueblo de Uyuni | su plaza y su torre del reloj |
| un Gran Premio en **Montmeló** | el pueblo de Montmeló | la misma rotonda, tres veces |
| una carrera en **Silverstone** | el pueblo de Silverstone | una calle y una autopista |
| las estaciones del **metro de Moscú** | Moscú | la plaza Roja |

> **Antes de buscar algo por el título de un gooal, separa qué NOMBRA y qué
> SITÚA.** El topónimo de la fila sitúa; casi nunca es el sujeto. Y en el título,
> lo que va detrás de «desde», «en» o «por» suele ser el complemento.

Es pariente de lo de Nevada: **el buscador acertaba de sitio y erraba de cosa.**
Y es la misma familia que «antes de medir parecido entre nombres, pruébalo en
catalán»: el error no estaba en la mecánica de buscar, estaba en qué se le daba
para buscar.

## Una regla que choca con el sujeto no da error: se incumple en silencio

Las fotos generadas llevaban una regla común, «la cabeza queda fuera del
encuadre», y para `gastronomia` era imposible de cumplir: **no se puede enseñar a
alguien comiéndose un escorpión sin boca.** El modelo no protestó —no hay forma
de protestar— y resolvió el choque por su cuenta: enseñó la cara entera. Pasó en
diez de las cuarenta y nueve, todas de comida.

> **Una regla común se prueba contra CADA categoría, no se escribe una vez y se
> da por puesta.** La pregunta es: ¿esta regla y el sujeto de esta categoría
> pueden cumplirse a la vez? Si no pueden, no gana la regla: gana el sujeto, y
> encima sin avisar.

El arreglo no fue insistir, fue dar un encuadre que SÍ se puede cumplir: cenital
sobre el plato y las manos, sin persona. Y de paso quitar la línea que pedía
«que se vea a alguien haciéndolo», que era la otra mitad del choque.

Es la misma forma que «una comprobación a medias es peor que ninguna», pero en
las instrucciones en vez de en las comprobaciones: **lo que no se puede cumplir
no se queda sin cumplir, se cumple de otra manera que nadie ha elegido.**

## Si la escena NECESITA el texto, cambia la escena, no la prohibición

«Ni una letra» estaba prohibido por su nombre —carteles, rótulos, dorsales con
número, pizarras— y aun así salieron dos con texto: **«Correr un 10K» con «10K»
escrito en el peto, y «Doctorarte» con una pizarra llena de fórmulas.**

No se coló. **La escena obvia lo pedía.** Un dorsal sin número no es un dorsal, y
una pizarra sin fórmulas no es nada. Y en el caso del doctorado fue peor: la
escena la había escrito yo, y decía literalmente «delante de una pizarra llena
de fórmulas».

> **Cuando la escena obvia necesita el texto, prohibir más fuerte no arregla
> nada: hay que cambiar de escena.** Un 10K son corredores de espaldas en una
> carretera al amanecer, sin petos. Un doctorado es el birrete y un diploma
> enrollado, sin nada escrito.

Y la comprobación que esto obliga a hacer: al repasar los 49 buscando más casos,
una regla mecánica —títulos, premios, carreras con número— marcó **13
candidatos**, y al mirarlos uno a uno **solo 2 lo eran de verdad**. Los otros 11
ya tenían una escena que no pedía texto. Otra vez: la regla trae candidatos,
decide quien mira.

## Un reemplazo que no encuentra su texto es un FALLO, no un acierto

`BottomNav.tsx` estaba guardado con finales de línea de Windows (CRLF) y el
guion que lo modificaba buscaba textos de varias líneas escritos con saltos
normales. **No casó ninguno, no cambió nada, y el guion imprimió "ok".** La
barra siguió con cuatro pestañas y eso solo se supo al abrir la pantalla.

> **Todo guion que modifique ficheros tiene que FALLAR si el número de
> sustituciones es cero, y decir en cuál.** No avisar: fallar y parar.

En la práctica, el molde es este, y no cuesta nada:

```js
const leer = f => readFileSync(f, 'utf8').replace(/\r\n/g, '\n')  // CRLF fuera
let s = leer(fichero)
const cambiar = (viejo, nuevo) => {
  if (s.split(viejo).length !== 2) {   // ni 0 veces ni 2: exactamente 1
    console.error('PARA, no encuentro:', JSON.stringify(viejo.slice(0, 60)))
    process.exit(1)
  }
  s = s.replace(viejo, nuevo)
}
```

Dos detalles que son el fallo entero:

1. **Normalizar los finales de línea al leer.** El repo se trabaja en Windows
   con `core.autocrlf`, así que en disco hay CRLF y en git LF. Un fichero que
   ya hayas reescrito entero estará en LF y el de al lado no: **el mismo guion
   funciona en unos ficheros y falla en otros**, que es lo que más despista.
2. **Comprobar que aparece UNA vez, no "al menos una".** Si aparece dos, el
   `replace` cambia la primera y deja la otra, y eso tampoco es lo que querías.

Y el reverso, que pasó el mismo día: si un cambio ya estaba aplicado de una
vuelta anterior, el guion para y **no escribe nada de lo que sí había hecho**.
Por eso el guion se relanza entero después de quitar lo ya aplicado, nunca se
da por bueno a medias.

## Probar el estado vacío no prueba el lleno

El muro perdió su pestaña y pasó a llegarse desde una línea que solo aparece
cuando hay algo que contar. Para comprobar esa puerta **había que insertar un
post de verdad**: con las cuentas de prueba recién creadas, lo único que se
habría comprobado es que la línea no sale nunca — que es la mitad que no
importaba.

> **Cuando algo solo existe si hay datos, la prueba pone los datos.** Si no, lo
> que pasa en verde es el caso vacío, y el caso vacío casi siempre funciona.

Es la misma familia que el cebo de `invitaciones_email` y que lo de la
comprobación a medias, pero al revés: allí faltaba el cebo que debía ser
rechazado, y aquí falta el dato que hace aparecer lo que se quiere ver. En las
dos, **la prueba pasa sin haber mirado nada.**

Y lo bueno de ponerlos: los datos de prueba hacen aparecer también lo de al
lado. El post que se insertó para la línea del muro enseñó, de paso, que el
texto sale bien con el nombre y el gooal, cosa que nadie había visto nunca.

## Un fallo con forma conocida nunca está solo

Al arreglar algo, la pregunta no es «¿ya está?», es **«¿dónde más está esto
mismo?»**. Y se contesta buscando en todo el repositorio ANTES de darlo por
cerrado, no cuando aparezca.

El caso, del 9-10-2026: `amigosDe()` leía la tabla `follows` sin paginar, y
PostgREST corta en 1.000 filas sin avisar. Se arregló. Al buscar esa misma forma
—una lectura de `follows` sin `.range()`— apareció **`getMuroFeed()`**, que se
trae a quién sigues para saber de quién enseñar posts. Pasado el millar, el muro
habría dejado de enseñar a parte de la gente a la que sigues, y no como un error:
**como si esa gente no publicara nada.**

Es barato y da de más: buscar las lecturas de una tabla es un `grep`, y de paso
el repaso dijo cuáles **no** eran el fallo —los contadores piden `count` sin
traerse filas, el «¿le sigo?» es un `maybeSingle`— que es información que vale
tanto como el arreglo, porque evita volver a mirarlas.

La forma de buscar es por la **forma**, no por el nombre: no «dónde llamo a
amigosDe», sino «dónde leo esta tabla sin paginar». El fallo no está donde está
la función, está donde está el patrón.

Y el matiz que salió en el mismo repaso, porque confundirlos sería el error
siguiente: **un tope puesto a mano no es un corte silencioso de la base.**
`getListaSeguidores` corta en 200 con un `.limit(200)` escrito a propósito. Eso
no es este fallo — pero tampoco se dice en pantalla, así que está apuntado
aparte, en la deuda.

## Una comprobación a medias es peor que ninguna

Es la lección más cara de este repo y conviene leerla antes de escribir
cualquier validación.

El geocodificador comprueba que el pin cae en el país que dice el gooal. Para
eso traduce el país a código ISO con una tabla. **Esa tabla se escribió con los
43 países de las filas que se estaban arreglando, y en el catálogo había 65.**
Los 22 que faltaban —Francia, México, Australia, Suiza, Rusia…— pasaron por el
geocodificador **sin que nadie les comprobara el país**, y el informe decía
igualmente que todo estaba comprobado.

Una comprobación que solo cubre parte de los datos **es peor que no tenerla**,
porque parece que protege. Sin ella, uno desconfía y mira; con ella a medias,
uno se fía.

De ahí tres reglas:

1. **Una tabla de traducción se contrasta contra TODOS los datos**, no contra
   los que se están tocando. Es una consulta: qué valores distintos hay y
   cuáles no están en la tabla.
2. **Lo que no se puede comprobar se rechaza, no se da por bueno.** Un país que
   no esté en la tabla hace que la respuesta se descarte y salga en el informe.
   Un rechazo visible siempre es mejor que un pase a ciegas.
3. **Y el montaje de la prueba también se comprueba.** Un cebo que no se
   inserta deja una prueba que pasa sin comprobar nada: pasó dos veces con
   `invitaciones_email`, y la tabla parecía cerrada estando abierta.

## Y la que da falsas alarmas se deja de mirar

Es la otra cara de la de arriba, y acaban en el mismo sitio: con nadie mirando.
Una comprobación a medias hace que te fíes de más; una que alarma sin motivo
hace que dejes de leerla, y el día que avise de algo real tampoco la mirará
nadie.

El caso: `comprobar.mjs` pide cada foto del catálogo a Supabase sin ninguna
clave, como la pediría el móvil de cualquiera. Al pedir 277 seguidas, Supabase
responde **429** a unas cuantas —«ahora no», por ráfaga— y el guion las contaba
como **ROTAS**. Dijo «7 rotas», y al repetirlo dijo otras siete **distintas**.
Esa es la firma de una falsa alarma: si las que fallan cambian en cada vuelta,
el problema no está en los datos. La respuesta de verdad era **277 de 277**.

Lo que distingue una cosa de la otra:

- **«Ahora no»**: 429 y cualquier 5xx, y un corte de red. No dicen nada de la
  foto. Se espera y se reinsiste (1 s, 3 s, 8 s).
- **«Está mal»**: un 400 o un 404 —un objeto que no existe en el cubo responde
  **400**—, un `content-type` que no es `image/webp`, o un fichero de menos de
  2 KB. Eso sí es la foto, y no se reintenta.

Tres reglas, que son las que quedaron en el guion:

1. **Reintentar antes de acusar.** Solo se declara rota la que sigue fallando
   después de los reintentos.
2. **Y bajar el ritmo.** El límite es por ventana de tiempo: después del primer
   freno, seguir a toda velocidad garantiza el siguiente. El bucle se frena solo
   y lo dice por pantalla.
3. **Decir cuántas hubo que reintentar.** Si no se cuenta, no se sabe si el
   «todo bien» costó cero o costó cuarenta, y ese número es el que avisa de que
   algo va mal en el almacén antes de que empiece a fallar de verdad.

Y la cuarta, que viene de la sección de arriba: **lo que ni con reintentos se
puede comprobar no se declara roto, pero tampoco bueno.** Sale en una lista
aparte —«no se han podido comprobar»— y el guion termina con error igualmente,
para que no pase en verde algo que nadie ha podido mirar.

### Un sitio reconocible, no un nombre propio

Al decidir qué gooals pueden llevar foto generada, la pregunta **no** es si el
título lleva un nombre propio: es **si lleva un sitio que alguien podría
reconocer**.

La regla mecánica —buscar palabras con mayúscula— marcó 70 de 73, y siete eran
falsos positivos: **Michelin, Ironman, medio Ironman, Hyrox, el C1 de inglés, el
Open Water y «un GR»**. Son marcas, pruebas con nombre, niveles y
certificaciones. Nadie mira una foto y dice «ese no es el Ironman»; sí dice «ese
no es el Pedraforca».

> Lo que obliga a cerrar el encuadre es que **la imagen pueda reclamar ser un
> sitio concreto y no serlo**. Una marca no se reclama: se lleva puesta o no
> sale. Un sitio sí.

Y el corolario, que es el de siempre en este repo: la regla de las mayúsculas
sirve para traer candidatos, no para decidir. Aquí se pasó de ancho siete veces
de setenta.

### Cuando varios gooals comparten acción, cambia el encuadre, nunca el lugar

Cinco puertos de montaña en bici, tres ferratas, seis navegaciones, cuatro
platos locales. Con el encuadre cerrado —sin el sitio reconocible— las cinco
fotos de puerto salen casi iguales. Y eso tiene un coste que no es estético:

> **Cinco imágenes gemelas seguidas no se leen como «la misma acción»: se leen
> como un error de duplicado.** El catálogo parece roto, no coherente.

La tentación es diferenciarlas enseñando el sitio —el Angliru reconocible, el
Ventoux pelado—, y eso **rompe la regla que justificaba el encuadre cerrado**. La
variación va en otro sitio:

> **Mismo estilo, mismo tratamiento, distinto MOMENTO de la acción.** Uno desde
> detrás con el manillar y la rampa; uno de perfil en una curva de herradura;
> uno desde arriba con las lazadas abajo; uno con lluvia; uno al amanecer a
> contraluz.

Está montado en `scripts/fotos-ia/estilos.mjs` como grupos: cada gooal recibe el
momento que le toca **por su posición dentro de su grupo**, igual que el reparto
de quién sale en la foto. Por turno y no al azar, que es lo único que garantiza
que no se repitan.

Se va a repetir con las ferratas, las cimas, los GR y los mercados: cuando se
añadan gooals a un grupo, se les añade su momento.

## No deduzcas «esto ya está hecho» de un efecto que produce un paso posterior

La más sutil de la semana, y por poco cuesta 70 MB de basura en el cubo.

El guion que sube las fotos va en dos pasos separados a propósito: **(2)** subir
al cubo, que es reversible, y **(3)** escribir en el catálogo, que toca lo que
ve la gente. Y para poder pararse y seguir, antes de subir cada imagen miraba
si ya estaba hecha… **mirando `imagen_url` de la fila**.

Esa columna la escribe el paso 3.

Así que entre el paso 2 y el 3 el guion **no tenía forma de saber lo que acababa
de hacer**. Relanzarlo ahí en medio —que es exactamente lo que hice para
reintentar la única que había fallado— habría vuelto a subir las 231, y con
**nombre nuevo cada una**, porque el nombre no se reutiliza nunca y con razón:
el cubo sirve con caché de un año. 70 MB duplicados, **sin que fallara nada**.

> **Un proceso en varios pasos anota su progreso en el paso que lo produce, no
> lo infiere de un efecto posterior.** Si para saber si hiciste A tienes que
> mirar algo que escribe B, entonces entre A y B eres amnésico — y ese hueco
> es justo donde se reanuda un proceso que se cortó.

El arreglo: cada subida se anota en `scripts/fotos-definitivas.json` como
`subida_como` **en cuanto ocurre**, no al final. Si se corta a la mitad, lo
hecho queda escrito. La memoria de lo hecho vive donde vive la verdad.

La señal para detectarlo en cualquier guion con pasos: **mira de dónde sale el
«ya está hecho» de cada paso y comprueba que lo escribe ESE paso.** Si lo
escribe otro, hay un hueco.

## No indexes por un campo que no es único

El guion que sube las fotos construía un índice de todo el catálogo con
`new Map(filas.map(f => [f.titulo, f]))`. Parece inofensivo y no lo es: **el
título NO es único en `gooals_v2`.** Conviven el gooal publicado y su gemelo
retirado del catálogo viejo — «Correr una media maratón», «Pilotar un kart» —, y
un `Map` se queda con **el último**, que resultó ser el retirado.

El resultado: el guion informaba de que esos dos gooals «están retirados»
teniendo el publicado delante, **y no dio ningún error**. Pasó la comprobación
en seco, que para eso está, pero podría no haber pasado.

> **Si una clave puede repetirse, o se filtra antes o se para al encontrar el
> duplicado. Adivinar no es una opción**, y quedarse con el último es adivinar
> sin saberlo.

Ahora el índice se construye solo con lo publicado, y si un título saliera dos
veces *publicado* el guion se detiene y los nombra. Lo mismo vale para
`gooals_v2.titulo` en cualquier otro sitio: es el campo por el que da la gana
indexar, y es el que no se puede.

## Una regla que el estado actual no puede cumplir es un bloqueo, no una regla

«Lo que no está declarado no se sube.» Buena regla, y el guion la aplicaba: se
paraba si encontraba en el catálogo una imagen que no estuviera en
`scripts/fotos-definitivas.json`.

Se paraba **siempre**, porque las 275 fotos que ya estaban en el catálogo vivían
solo en la base: las subió el pipeline viejo antes de que ese fichero
existiera. La regla era incumplible desde el primer día.

> **Cuando una regla nueva choca con lo que ya hay, la salida no es relajar la
> regla: es poner al día lo que ya hay.** Relajarla —«falla solo con las
> nuevas»— deja un agujero permanente y encima disimulado.

Se declararon las 275 leyéndolas de la base. Pero eso trae su propia trampa, y
está avisada en el propio fichero:

> **`fotos-definitivas.json` guarda ahora DOS CLASES de entrada que no son lo
> mismo.** Las 232 nuevas pasaron una revisión a ojo, una a una. Las 275
> heredadas solo se leyeron de la base: **nadie las ha mirado** con los
> criterios de esta semana. Llevan `ya_subida: true` y `revisada: false`, y la
> cabecera del fichero lo dice con todas las letras, para que dentro de seis
> meses nadie lo lea como si fueran 507 fotos aprobadas.

Esas 275 son justo la lista que David irá marcando según vea alguna que no le
valga, que es la deuda apuntada el 8-10-2026.

## De dónde sale la foto de un gooal

Medido sobre **205 gooals revisados a ojo, uno a uno**, entre el 8 y el 9 de
octubre de 2026. Es lo que de verdad nos llevamos de tres días de pruebas.

```
museos y monumentos .......... Commons, 10/10
paseos y vistas .............. Commons,  9/10
cumbres y miradores .......... Commons, 7-9/10
fiestas ...................... Commons,  7/10
deporte de competición ....... Commons,  3/10  → IA
acciones genéricas ........... IA (Commons no tiene gente haciendo cosas)
```

**El deporte de competición casi no está en Commons por derechos de imagen
dentro de los recintos.** En la hoja de competición salieron aficionados
haciéndose fotos con pilotos, paddocks vacíos y tres logotipos del Seis Naciones
sobre fondo negro. **La excepción es el ciclismo de carretera** —Tour, Giro,
Vuelta—, que se fotografía desde la cuneta y sí está: salieron el pelotón de
cerca y el maillot amarillo entre el público.

> **Antes de lanzar una tanda nueva, mira esta tabla y ELIGE la fuente. No
> pruebes las dos.** Probar las dos costó una tarde entera y 217 búsquedas para
> acabar sabiendo lo que esta tabla dice en seis líneas.

Y la regla que decide a qué fila mirar es la de más arriba: **si el verbo es
ESTAR** —visitar, ver, pasear, cruzar, subir a, ir a— el lugar es la acción y
Commons lo tiene. **Si es HACER algo en un sitio** —comer, bucear, correr,
dormir, escalar— Commons tiene el sitio pero no la acción, y toca IA con
encuadre cerrado.

### Una hoja de revisión que no deja decidir no es una revisión

Las primeras hojas iban a veinte gooals por página, cuatro candidatas cada uno.
Cada miniatura salía a **130 px**, y a ese tamaño **no se puede contestar la
única pregunta que importa**: ¿esta foto enseña lo que dice el título? Se ve que
hay un edificio; no se ve si es *ese* edificio.

Se rehicieron a **diez por hoja y a tamaño completo** —250 px por miniatura— y
entonces sí. Son el doble de hojas y se miran igual de rápido, porque lo que
cuesta no es pasar páginas: es dudar.

> Antes de montar una hoja de contacto, comprueba a qué tamaño se va a ver de
> verdad **una** miniatura. Si a ese tamaño no puedes decidir, la hoja no sirve
> por muchos que quepan.

## Prohibir no sustituye a describir

Tercera vez esta semana, y las dos anteriores están anotadas por separado más
arriba. Puestas juntas se ve que son una sola:

> **Cuando la imagen canónica de algo CONTIENE lo prohibido, repetir la
> prohibición no funciona: pelea con el sujeto, y el sujeto gana.** Hay que
> escribir otra escena, una que no pida ese elemento.

Los cinco casos, que son el mismo:

| lo que se pedía | lo prohibido que salía igual | por qué |
|---|---|---|
| la piscina del Marina Bay Sands | el edificio | **la piscina famosa ES el edificio** |
| flotar en el mar Muerto | un periódico | la foto canónica es leyendo el periódico |
| un día en Ferrari Land | el escudo de Ferrari | el parque se llama como la marca |
| sacarse el C1 de inglés | una hoja llena de texto | **un examen ES texto** |
| correr un 10K | el dorsal con el número | un dorsal sin número no es un dorsal |

Y el sexto, que es la misma forma con otra cara: «la cabeza fuera del encuadre»
contra **comer**. No se puede enseñar a alguien comiéndose un escorpión sin
boca, así que el modelo enseñó la cara entera en diez de cuarenta y nueve.

La diferencia entre que funcione y que no:

- **No funciona**: insistir. «NI UNA LETRA», «ningún logotipo», «no se ve el
  lugar». La instrucción está, y pierde.
- **Funciona**: cambiar la escena. El borde infinito de la piscina con la ciudad
  desenfocada. Flotando con las rodillas fuera **y sin sostener nada**. El rizo
  de la montaña rusa en silueta contra el cielo. La hoja de examen **vuelta del
  revés**. Corredores de espaldas al amanecer **sin petos**. El plato visto
  desde arriba, con las manos y sin persona.

La señal para detectarlo antes de generar, que es lo que ahorra la vuelta:
**imagínate la foto de catálogo de ese gooal. Si lo prohibido está dentro de
ella, no lo prohíbas: describe otra foto.**

## Una escena describe lo que hay; un encuadre dice qué entra en la foto

Son dos cosas distintas y confundirlas costó tres fotos con cara.

Para los gooals que no tienen nada que fotografiar, el prompt lleva una escena
escrita a mano: «un birrete apoyado sobre unas manos, junto a un diploma
enrollado». Parecía que esa escena ya decía quién se ve, así que se le quitó el
encuadre para que no se contradijeran.

Salió con la cara entera. Y «Probar el pulpo vivo» también. Y «Hacer un
voluntariado en el extranjero», **cuya escena decía literalmente «sin que se vea
ninguna cara»**.

> **Describir un birrete no impide que el modelo meta a quien lo sostiene.** Una
> escena enumera lo que hay en la foto; el encuadre dice qué entra y qué se
> queda fuera. Lo segundo no se deduce de lo primero, y una escena que menciona
> unas manos no está diciendo que no haya una cabeza encima.

Así que el encuadre va SIEMPRE. Lo que sí hay que vigilar es que escena y
encuadre no se contradigan —ése era el miedo original, y era razonable—, y eso
se arregla eligiendo el encuadre que le pega a esa escena: a «unas manos
sosteniendo un birrete» le toca «recortado por los hombros», no «de espaldas».

Es la misma familia que lo de la regla que choca con el sujeto: **la respuesta a
dos instrucciones que riñen no es quitar una, es escribir la que sí se puede
cumplir.**

## Una lección en un fichero no se aplica sola; un módulo compartido sí

Esta es sobre dónde vive una lección, y es de las que más vale la pena.

El 8-10-2026 se midió que un 429 no es un fallo sino un freno, que hay que
esperar, reinsistir y bajar el ritmo del bucle entero. Se arregló
`comprobar.mjs`, se escribió en CLAUDE.md con su sección propia... y **ese mismo
día**, unas horas después, el guion que genera las imágenes perdió **cuatro de
trece** y luego **cuatro de cinco** por tener sus propias esperas de 4s/12s/30s,
escritas a mano, demasiado cortas.

No se había olvidado la lección. El problema es dónde vivía cada cosa:

> **La lección vivía en CLAUDE.md y la espera vivía dentro de cada guion,
> copiada.** Un fichero de lecciones no se aplica solo al guion siguiente. Un
> módulo compartido sí: en cuanto `scripts/lib/frenos.mjs` existe, el guion que
> lo importa hereda la lección entera sin que nadie se acuerde de ella.

La regla práctica:

1. **Si una lección se puede convertir en código compartido, conviértela.** El
   texto explica *por qué*; el módulo garantiza el *qué*.
2. **La señal de que toca es la segunda copia.** La primera vez que escribes una
   espera con reintentos es un guion; la segunda vez es un módulo. Aquí hubo
   tres antes de que nadie lo viera.
3. **Y el texto se queda igualmente**, apuntando al módulo: sin el porqué, el
   siguiente que lea `frenos.mjs` no sabrá por qué las esperas son tan largas y
   las acortará.

Lo mismo valía ya para `scripts/lib/paises-iso.mjs`, que nació igual: de una
tabla copiada que estaba incompleta en un sitio y completa en otro.

### Y el matiz que costó una hora: un 429 no siempre es un freno

OpenAI devuelve **429 también cuando la cuenta se queda sin saldo**. El mismo
código para «ahora no» y para «no puedes pagar esto». Se estuvo una hora
reintentando con esperas de hasta dos minutos, y el informe decía que el límite
estaba «caliente de tanto machacarlo». No lo estaba: se había acabado el
crédito a mitad de tanda.

> **El estado HTTP no basta para clasificar un error: hay que mirar el cuerpo.**
> `insufficient_quota` y `credit_balance_exhausted` llegan con un 429 y no se
> arreglan esperando nunca.

Y la forma del fallo es la de siempre: una regla que cubre *casi* todos los
casos —429 es un freno— es peor que ninguna cuando falla, porque los reintentos
hacen que parezca que algo está pasando. Ahora la tanda se para en el primer
intento y dice qué hay que hacer.

## Antes de medir parecido entre nombres, pruébalo en catalán

La zona donde esto se usa es catalana. **«Marató» y «Maratón» son la misma
palabra con una tilde de diferencia**, y cualquier regla que mida parecido entre
textos en castellano se rompe ahí sin avisar.

Sale de la regla que descarta el artículo de Wikipedia cuando no habla de lo que
buscas. La versión simple —que compartan al menos una palabra— deja pasar dos
casos conocidos («Correr un 10K» casó con «10K Projects», un sello discográfico;
«Actuar en un escenario» con un anime llamado «… Mismo Escenario»). La tentación
era afinarla: pedir que coincida **la mitad** de las palabras del artículo. Con
eso caen los dos... y cae también **«Marató de Barcelona» contra «Maratón de
Barcelona»**, que es un acierto de verdad.

> **Antes de dar por buena una regla que compara nombres, pruébala con un par
> catalán/castellano.** Si el par no sobrevive, la regla no vale, por bien que
> funcione con todos los demás ejemplos.

Dónde va a volver a aparecer: el buscador de la app (quien escriba «marato» tiene
que encontrar «Marató»), la detección de títulos duplicados del catálogo, el
cruce de nombres del geocodificador, y cualquier cosa que normalice acentos. Y
ojo, que quitar los acentos **no** lo arregla: sin tildes quedan «marato» y
«maraton», que siguen siendo distintas.

Y la lección hermana, que es de carácter:

> **Una regla que no lo caza todo y lo dice por escrito es mejor que una ajustada
> hasta que arregla unos casos y rompe otros.** Lo que no se puede hacer es
> contar que caza algo sin haberlo comprobado: la regla de aquí arriba se
> presentó diciendo que cazaría tres casos y cazaba uno, y se supo al
> implementarla, no al describirla.

## Un contador guardado se actualiza al sumar y nunca al restar

`gooals_v2.veces_completado` es una caché: el número de personas que han
conseguido ese gooal. Se recalcula cada vez que alguien lo consigue
(`sincronizarVecesConseguido`), y **no se recalcula cuando una fila desaparece**,
porque borrar no pasa por ahí.

Pasó con las cuentas de prueba: se crean, consiguen un gooal, el contador sube;
se borran al terminar y el contador se queda. El 7-10-2026 decía que **7 gooals
los había conseguido alguien** cuando de verdad eran **3**. Nadie lo habría visto
hasta que una pantalla enseñara ese número — y la pantalla de Descubrir iba a
enseñarlo.

Es la misma familia que el cuadre del catálogo: **un número guardado y un número
calculable que no se comparan nunca acaban separándose**. La diferencia es que
aquí el guardado parece sano, porque sube bien.

Las tres cosas que hay que hacer con un contador así:

1. **Que haya una forma de recalcularlo entero**, no solo de incrementarlo:
   `node --env-file=.env.local scripts/recontar-conseguidos.mjs` (en seco), y con
   `--escribir` lo arregla. Compara contra `user_gooals`, que es la verdad.
2. **Pasarlo después de cualquier limpieza de datos**, en especial después de
   borrar cuentas de prueba.
3. **Y antes de enseñarlo en una pantalla nueva.** Un contador que nadie mira
   puede estar mal años; el día que se pinta, miente a todo el mundo a la vez.

## Un fichero de migración es un acta; politicas.sql es un estado

Dos clases de fichero en `supabase/`, y **no se mantienen igual**. Confundirlas
lleva a reescribir la historia o a creerse un fichero que ya no describe nada.

**`politicas.sql` declara CÓMO ESTÁN LAS COSAS HOY.** Tiene que estar al día, se
lanza entero cuando haga falta y su promesa es que, lanzado entero, deja la base
en el estado correcto. Si algo cambia, **se corrige el texto**: la frase vieja se
va, y si merece recuerdo se queda como «QUITADA el <fecha>, y por qué». Si la
base y este fichero no coinciden, uno de los dos está mal.

**`fase3<x>.sql` cuenta LO QUE PASÓ UN DÍA.** Es un acta: se ejecutó una vez, con
ese contenido, y eso no cambia nunca. Sus comprobaciones y sus explicaciones
describen el mundo de aquel día, y van a caducar — es normal, no es un fallo.
**No se corrigen: se les añade una nota debajo**, fechada, diciendo qué dejó de
ser verdad y dónde está lo de ahora.

El caso que lo fijó: `fase3m.sql` decía «las dos políticas de lectura que se
quedan (los gooals verificados y los conquistados)». Era verdad el 15-9-2026. El
7-10 cayó la de los conquistados y el 8-10 la última de `user_gooals`, así que
hoy la de lectura que queda es una. **La línea sigue ahí, intacta, con una nota
del 8-10 debajo.** Quien lea esa migración entiende qué se ejecutó y por qué, y
sabe que para el estado de hoy tiene que mirar a otro sitio.

La regla corta:

> **Al que declara un estado se le corrige el texto. Al que cuenta un hecho se
> le añade una nota debajo.** Y al segundo nunca se le quita nada, porque es la
> única prueba de por qué la base es como es.

Esto convive con «Una razón escrita caduca» y no la contradice: una razón
caducada en `politicas.sql` se arregla cambiándola, y una en `fase3m.sql` se
arregla anotándola. Lo que no vale en ninguno de los dos es dejarla sola.

## Una razón escrita caduca

Y cuando caduca no avisa, porque sigue ahí, impecable, describiendo un mundo
que ya no existe.

La política que dejaba leer el muro a cualquiera con la clave pública llevaba
su razón al lado, y era buena el día que se escribió:

> ABIERTA A PROPÓSITO, y mirado columna por columna: un post lleva el texto, la
> foto, el gooal, los puntos y los likes. Ni correo, ni ubicación, ni un dato
> del perfil. **Y las fotos ya están en un bucket público.**

Dos días después las fotos de la gente se mudaron a un cubo privado y cada una
pasó a tener dueño y un "quién la ve". La última frase dejó de ser verdad **en
ese momento**, y con ella se cayó media justificación. Nadie tocó el comentario:
el código seguía compilando, las pruebas seguían pasando, y la razón seguía
escrita en presente.

La regla:

> **Cuando cambies el mundo que justificaba una decisión, ve a buscar las
> decisiones que se apoyaban en él.** No basta con que el código compile: una
> razón no da errores al quedarse vieja. Si acabas de hacer privado algo que era
> público, de cerrar algo que estaba abierto o de mover algo de sitio, busca por
> el nombre de lo que has cambiado ("bucket público", "gooals-media") y lee lo
> que salga.

Y su hermana, del mismo día: **una prueba que afirma lo contrario de lo que ya
es cierto es peor que no tenerla.** `scripts/comprobar-rls.mjs` comprobaba que
el muro SÍ se leía desde fuera —era la decisión correcta cuando se escribió—, y
el día que dejó de serlo había que darle la vuelta **en el mismo commit**, no un
rato después. Si no, pasa en verde, da confianza y describe el mundo anterior;
y un 14/15 tres semanas más tarde hace perder una tarde buscando una avería que
no existe. Es la misma familia que lo de la comprobación a medias.

## Un fichero 'use server' solo exporta funciones async

Y si le pones otra cosa, **no lo caza nada de lo que usamos antes de publicar**.

Pasó añadiendo una constante (`VISIBILIDADES`) a `src/lib/fotos-privadas.ts`,
que lleva `'use server'` arriba. Lo que ocurrió:

- `npx tsc --noEmit` → limpio.
- `npm run build` → **"Compiled successfully", y salida 0**.
- Abrir la app → **Explorar en blanco**, y en la consola del navegador:
  `A "use server" file can only export async functions, found object.`

Es decir: la comprobación que lo caza es **abrir la página**. Por eso las
pruebas de este repo entran por la pantalla y leen la consola del navegador
(`consolaDe()` en el arnés), y no se quedan en que compile.

La regla: si algo que no es una función async tiene que vivir cerca de unas
Server Actions, va en un módulo normal al lado. Las constantes de los permisos
están en `src/lib/permisos.ts`, que no lleva directiva, y las importan tanto las
acciones como el resto.

## Un insert de varias filas no respeta los valores por defecto

Se descubrió montando una prueba, y el día que alguien escriba un guion de
siembra se va a comer una tanda entera sin entender por qué.

Cuando le pasas a Supabase **un array de filas**, por debajo se convierte en un
solo `INSERT` con las columnas de TODAS las filas juntas. Las filas que no
nombran una columna no reciben su valor por defecto: **reciben `null`
explícito**. Si esa columna no admite nulos, falla **el lote entero**, y el
mensaje habla de la columna, no de que el problema sea mezclar filas distintas.

Pasó con `user_gooals.visibilidad`, que no admite nulos y tiene `'amigos'` por
defecto: tres filas lo traían y una no, y no se guardó ninguna.

Las dos salidas:

1. **Nombrar la columna en todas las filas**, aunque sea para repetir el valor
   por defecto.
2. O insertar **de una en una**, que es lo que hace la app hoy (`anadirGooal`,
   `conseguirSinFoto`, `completarGooal`): por eso esto nunca le ha pasado a un
   usuario. Si alguna vez se agrupan para ir más rápido, hay que acordarse.

Y lo de siempre: **el error del `insert` se mira**. Un `.insert()` sin
comprobar `error` deja la tabla vacía y todo lo de después mintiendo.

## Una nota pendiente sin sitio donde releerla no es un plan

Lo bueno del agujero de `es_admin` hay que decirlo: **la nota estaba puesta.** El
2-10-2026, al lado de la política de `user_gooals`, alguien escribió que eso
dejaba insertarse una fila con los puntos que uno quisiera y que habría que
comprobar si inflaba el marcador. Con fecha. Y era verdad.

Se contestó el **8-10-2026**. Seis días. No falló anotarlo: falló que la nota
vivía en la línea 122 de un fichero de SQL y **nadie vuelve a la línea 122 de un
fichero de SQL**.

De ahí dos reglas, y la segunda es la que sirve:

1. **Una nota pendiente lleva fecha** y dice qué habría que medir. Esa parte ya
   se hacía bien.
2. **Y además se apunta donde se relee**, que en este repo es la «Deuda
   conocida» de aquí abajo. El comentario se queda donde está —es donde hace
   falta leerlo al tocar esa línea—, pero la lista de lo que falta no puede
   estar repartida en doce ficheros.

Y cuando se contesta, **la respuesta va debajo de la pregunta**, con su fecha y
marcada como contestada, no en otro sitio. Una pregunta cuya respuesta está en
otro lado es una pregunta que alguien va a volver a hacer.

El repaso del 8-10-2026 encontró **una sola** nota abierta de verdad en todo el
repositorio (la restricción de la foto sin autor, abajo). Las demás «OJO» que
salen al buscar son avisos —cosas ya resueltas que explican por qué algo es como
es—, no trabajo pendiente. Conviene saber distinguirlas: un aviso se lee y se
sigue; una nota pendiente espera a alguien.

## Convenciones

- **El código y los comentarios, en español.** Es lo que hay en todo el repo.
- Los comentarios explican **por qué**, no qué. Si una decisión tiene una razón
  no obvia (un desempate por `id`, una RLS ausente a propósito), escríbela.
- Estilos en línea con `style={{}}`, no clases de Tailwind, salvo utilidades
  sueltas. Es lo que ya hay; no mezcles enfoques a mitad de fichero.
- Paginación: nunca un `.select()` sin `.range()` sobre una tabla que puede
  crecer. PostgREST corta en 1.000 filas y falla en silencio. Esto ya rompió
  Explorar una vez.

## Deuda conocida

- `src/lib/actions.ts` tiene ~1.160 líneas con todo mezclado: perfiles, gooals,
  muro, follows. Pendiente de partir por temas.
- Y lo que NO es deuda, por si alguien lo vuelve a apuntar: ya **no** conviven
  tres catálogos. `gooals` y `experiencias` se fueron con la v1; hoy la base
  tiene doce tablas y la única de catálogo es `gooals_v2` (más `gooals_revision`,
  que es temporal). El SQL de aquello está en `supabase/historico/`.
- **La restricción `gooals_v2_foto_con_autor` sigue sin poner**, y está escrita
  pero comentada al final de `supabase/fase3r.sql`. Impediría guardar una
  `imagen_url` sin `foto_autor` ni `foto_licencia`. **No se pega sin arreglar
  antes el panel**: el formulario de crear un gooal tiene campo para la
  dirección de la imagen y ninguno para el autor ni la licencia, así que a
  partir de esa restricción crear un gooal con foto desde el panel daría error.
  O se añaden los dos campos, o la restricción se queda sin poner. Anotado el
  5-10-2026; sigue abierto.
- **ANTES DEL PRIMER ENVÍO DE CORREOS: el alta todavía escribe `profiles.email`
  desde el navegador** (`src/app/page.tsx`). Alguien puede registrarse poniendo
  en su perfil un correo que no es el suyo, y **las comunicaciones leen de ahí**
  (`src/lib/comunicaciones.ts`), así que le escribiríamos a esa dirección. No
  tiene fecha: tiene una condición, y es que **no se manda la primera campaña
  hasta que esto esté cerrado**. Se cierra pasando el alta a un disparador sobre
  `auth.users` o a una Server Action; entonces el `grant insert` de
  `politicas.sql` se va entero. Anotado el 8-10-2026.
- **En pantallas cortas la tarjeta de Descubrir se sale.** En un iPhone SE
  (375×667) mide **347×402**, o sea una proporción de **0,863**, frente al
  0,59–0,625 de todos los demás móviles (362×579 en un Pixel, 402×667 en un
  iPhone Max, 384×650 en un Android grande). La tarjeta es `flex:1`, así que en
  una pantalla corta se queda casi cuadrada. **No es un problema de la foto: es
  de la pantalla.** Detectado el 8-10-2026 midiendo la proporción de la tarjeta
  para las fotos de IA, que era otra cosa. Pendiente de mirar.
- **Las 275 fotos de Commons no se sustituyen en bloque**, y es deliberado: casi
  todas son lugares con nombre, y ahí una foto real gana siempre — una Sagrada
  Família generada sería una basílica parecida pero falsa. Lo que se hará, poco
  a poco: David marca las de Commons que no le valen según las vaya viendo, y
  **esas se regeneran una a una**. Decidido el 8-10-2026.
- **LAS FOTOS DEL CATÁLOGO, LO QUE QUEDA Y EN QUÉ ORDEN.** Decidido el
  9-10-2026, y el orden importa:
  1. terminar las hojas de Commons de los 137 de «estar»
  2. **el panel, con los campos de autor y licencia** (lleva parado desde el
     5-10 y es lo que bloquea todo lo demás)
  3. `supabase/fase3z.sql`, que se pega en cuanto el panel esté
  4. el guion que sube, leyendo `scripts/fotos-definitivas.json` — y que
     **FALLE** si encuentra un gooal con imagen que no esté declarado ahí, en
     vez de tirar de carpeta
  5. subir

  > **Nada entra en la base antes del 3.** Las 137 fotos pueden esperar en
  > ficheros; lo que no puede es entrar una sin crédito y que luego haya que
  > buscarla.
- **`npm run lint` falla con 14 errores y hay que resolverlo.** Todos del mismo
  tipo —`Calling setState synchronously within an effect can trigger cascading
  renders`— repartidos por `inicio`, `muro`, `perfil`, `onboarding`,
  `Descubrir`, `MapaGooals`, `InstallBanner`, `SplashScreen`,
  `GooalV2DetailModal`, `ExplorarFeed`, `BuscarUsuariosSheet` y
  `DownloadLanding`, más dos de `Cannot create components during render` y
  `Cannot access refs during render`.

  **El problema no son los 14 avisos: es que `npx tsc --noEmit && npm run lint
  && npm run build` ahora falla SIEMPRE.** Una comprobación que falla por algo
  que nadie va a arreglar deja de mirarse, y el día que avise de algo real
  tampoco la mirará nadie — que es literalmente lo que está escrito más arriba,
  en «Y la que da falsas alarmas se deja de mirar».

  Cómo se resuelve, cuando toque:
  1. abrir tres de los catorce y decidir si son un fallo de verdad — un
     `setState` dentro de un efecto puede provocar un bucle de renderizado, y
     eso **sí** se nota en el móvil
  2. los que lo sean, se arreglan
  3. los que no, se deciden a propósito: o se cambia el código, o se apaga esa
     regla **dejando escrito POR QUÉ, con fecha**

  Lo que no vale es dejarlos ahí haciendo fallar la comprobación. Anotado el
  9-10-2026, con el orden de las fotos por delante.
- **`getListaSeguidores` corta en 200 y no lo dice.** Es un `.limit(200)`
  escrito a mano, así que **no** es el corte silencioso de la base (ese está
  explicado en «Un fallo con forma conocida nunca está solo»): la diferencia es
  que este tope lo pusimos nosotros y la base no tiene nada que ver. Pero el
  efecto en pantalla es parecido — con más de 200 seguidores, la lista enseña
  200 y parece completa. Hoy el máximo posible son 56 usuarios en toda la app,
  así que no corre prisa; cuando el número se acerque, o se pagina o se dice en
  pantalla que hay más. Anotado el 9-10-2026.
- **Las tres relaciones de "en común" se calculan en el navegador**, cruzando
  las dos listas que el perfil ya se trae con mis propios estados. Hoy eso no
  añade ni una consulta y por eso se hizo así. Pero **se apoya en que el perfil
  cargue las dos listas ENTERAS**: el día que esa carga se pagine o se recorte,
  las tres cifras empezarán a contar solo lo que se haya traído y seguirán
  pintándose igual de bien — sin error, sin aviso, con números más pequeños de
  los que son. No tiene fecha, tiene condición: **cuando se toque la carga del
  perfil, esto se mira el mismo día.** Vive en `cruzar()`, dentro de
  `src/components/perfil/EnComun.tsx`. Anotado el 9-10-2026.
- No hay tests.
