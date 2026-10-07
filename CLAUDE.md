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

1. **Una política NO concede permisos, solo los limita.** Y aquí `anon` y
   `authenticated` tienen todos los permisos en todas las tablas (el reparto por
   defecto de Supabase), así que **la RLS es la única cerradura**: cualquier
   política permisiva que se añada abre la tabla al instante.
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
- No hay tests.
