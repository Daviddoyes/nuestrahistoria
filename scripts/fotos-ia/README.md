# Fotos del catálogo, generadas con IA

Herramientas **locales**, como las de `scripts/fotos-catalogo/`. No forman parte
de la app, no se despliegan, y la clave `OPENAI_API_KEY` vive solo en
`.env.local` — **nunca con `NEXT_PUBLIC_` delante**, que la pondría en el bundle
que descarga cualquiera.

## Por qué, si ya había fotos de Commons

Porque Commons se quedó corto, y está medido: de 146 gooals de acción salieron
**54 fotos**, y **29 de los 60 genéricos volvieron de vacío** — entre ellos
padres que ya existían como «Correr un 10K», «Practicar esquí» o «Cantar en un
karaoke». No faltaban padres: es que **Commons documenta sitios y objetos, no
gente haciendo cosas**. Está contado en `CLAUDE.md`, en «Commons tiene sitios y
objetos, no gente haciendo cosas», y la conclusión de allí era literal: *eso es
un problema de fuente, y se decide aparte*. Esto es ese aparte.

Y la diferencia que de verdad cambia el trabajo:

> Con Commons, una foto que no gustaba obligaba a volver a buscar candidatas y
> mirarlas a ojo. Con esto, **se cambia una línea del prompt y se regenera en
> segundos**, para una o para las 260.

## El prompt se construye solo

**Nunca se escribe un prompt a mano para un gooal.** `estilos.mjs` tiene una
plantilla que se rellena con los campos de la fila —título, categoría, ámbito,
ciudad y país— más uno de los bloques de estilo. Tocar la plantilla cambia las
260 a la vez; escribir uno a mano crea una excepción que nadie va a recordar.

El prompt exacto de cada imagen se guarda **al lado de ella**, en un `.txt` y
dentro del `.json`. Sin eso, una foto que no gusta no se sabe retocar.

### Tres decisiones que no son obvias

- **Los prompts van en español.** Quien decide si una foto vale es David, y los
  lee debajo de cada imagen para pedir cambios. Un prompt que no puedes leer no
  lo puedes retocar. Si se viera que el modelo obedece peor en español, se
  prueba en inglés **y se mide** antes de cambiarlo.
- **1024×1536, medido y no supuesto.** La tarjeta de Descubrir es `flex:1`, así
  que su proporción sale de la pantalla. Medida en el navegador: 362×579 en un
  Pixel, 402×667 en un iPhone Max, 384×650 en un Android grande — o sea de 0,59
  a 0,625. De los tres tamaños de la API el vertical es 1024×1536 = **0,667**, el
  más cercano, y falla por el lado bueno: al ser la imagen más ancha que la
  tarjeta, el `object-fit: cover` **recorta por los lados** y no por arriba y
  abajo. Por eso las tres plantillas piden el sujeto centrado y con aire a los
  lados.
- **El sujeto es LA ACCIÓN, no el decorado.** Es la regla que ya está en
  `CLAUDE.md`: «Subir al Angliru» es una bici subiendo, no la montaña. Por eso el
  lugar entra como contexto y la plantilla dice expresamente que no sea el tema.

## Los comandos

```bash
# Ver qué haría y leer un prompt de ejemplo. No cuesta nada.
node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs --seco

# Generar UNA, para comprobar que el modelo responde y ver el coste real.
node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs --una

# Las 48 de la prueba de estilos (8 gooals x 3 estilos x 2 vueltas).
node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs

# La hoja para mirarlas. Solo lee: se puede lanzar las veces que haga falta.
node scripts/fotos-ia/hoja.mjs
#   -> "Claude outputs/estilos-ia.html"
```

**Se puede parar y seguir:** antes de pedir una imagen mira si el fichero ya
está. Cortar a mitad no se paga dos veces.

## Las dos vueltas no son un capricho

De cada gooal se generan **dos imágenes con el MISMO prompt**. Es lo que de
verdad se está comprando:

> Un estilo bonito que sale distinto cada vez no sirve. **260 fotos que no se
> parecen entre sí son peores que ninguna**, porque entonces el catálogo parece
> recortado de sitios distintos en vez de diseñado.

Así que la pregunta al mirar la hoja no es «¿me gusta esta foto?», es «¿se
parecen las dos de al lado?».

## Lo que cuesta

Medido, no estimado: la cuenta sale de los tokens que devuelve la propia API y
de las tarifas publicadas. El guion lo imprime al terminar, con el coste por
imagen y la extrapolación a las 260.

> El número que manda es el del panel de OpenAI. Esto es una cuenta con las
> tarifas de hoy, y las tarifas cambian.

## Lo que esto NO hace

- **No toca la base ni Supabase.** Ni una escritura. Escribe en
  `Claude outputs/fotos-ia/` y para.
- **No sube nada al cubo `catalogo`.** El día que se decida el estilo, eso será
  otro guion, y tendrá que mirar lo mismo que `fotos-catalogo/subir.mjs`: nombre
  nuevo para cada corrección, porque el cubo sirve con caché de un año.
