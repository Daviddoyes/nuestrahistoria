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
src/types/        tipos. gooals.ts = Fase 3; planes.ts = arquitectura anterior.
supabase/*.sql    esquema. NO se ejecuta solo: se pega en el SQL Editor.
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

- `src/lib/actions.ts` tiene ~1.700 líneas con todo mezclado: planes, perfiles,
  gooals, muro, follows. Pendiente de partir por temas.
- Conviven tres catálogos: `gooals_v2` (el bueno), `gooals` (v1) y la biblioteca
  de `experiencias` de la migración. Falta decidir qué se retira.
- No hay tests.
