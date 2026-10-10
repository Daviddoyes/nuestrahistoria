// Las plantillas de prompt. El prompt NO se escribe a mano para cada gooal: se
// rellena con los campos de su fila (título, categoría, ámbito, lugar) más uno
// de los bloques de estilo.
//
// Esa es la ventaja entera sobre Wikimedia: una foto que no gusta se retoca
// cambiando una línea de aquí y se regenera en segundos, para una o para las
// 260. Con Commons había que volver a buscar candidatas y mirarlas a ojo.
//
// ── EL ESTILO ESTÁ DECIDIDO: EL A, ENDURECIDO ─────────────
//
// Decidido el 8-10-2026 mirando los tres mosaicos de la primera prueba, y el
// criterio que mandó NO fue cumplir las reglas:
//
//   > El listón es que la foto dé ganas de clicar.
//
// La B cumplía todas las reglas y no servía: son pictogramas, y un icono de
// alguien esquiando no hace querer esquiar. Además la mitad eran verde oscuro
// sobre negro y a tamaño de tarjeta no se leían.
//
// La C era la más bonita y la más consistente, y se descartó por lo que hacía
// SENTIR: vista entera de golpe parecía melancolía. El karaoke era un thriller,
// la cabaña daba pena, el maratón era un corredor solo en una calle vacía. Esto
// es una app de cosas que quieres hacer, no de cosas que echas de menos, y eso
// no lo arregla media parada de luz.
//
// Y las dos pegas de la A resultaron no ser del estilo: dentro de la propia
// prueba, el glaciar y el paracaídas ya resolvían la cara solos, y la segunda
// vuelta del maratón también. Sabía hacerlo; no se lo estábamos pidiendo. De
// ahí los cuatro cambios de abajo.
//
// ── POR QUÉ LOS PROMPTS VAN EN ESPAÑOL ────────────────────
//
// Porque quien decide si una foto vale es David, y los va a leer debajo de cada
// imagen para pedir cambios. Un prompt que no puedes leer no lo puedes retocar.
//
// ── POR QUÉ 1024x1536 ─────────────────────────────────────
//
// Medido en el navegador, no supuesto: la tarjeta de Descubrir mide 362x579 en
// un Pixel, 402x667 en un iPhone Max y 384x650 en un Android grande. O sea una
// proporción de 0,59 a 0,625. De los tres tamaños que da la API, el vertical es
// 1024x1536 = 0,667, el más cercano.
//
// Y falla por el lado bueno: al ser la imagen MÁS ANCHA que la tarjeta, el
// `object-fit: cover` recorta POR LOS LADOS y no por arriba y abajo. Por eso
// todas las plantillas piden el sujeto centrado y con aire a los lados.
import { clasificar } from './reparto-reglas.mjs'
import { DECIDIDOS, CAMARA } from './decisiones.mjs'

export const CON_SITIO_RECONOCIBLE = new Set([
  "Bañarte en la cala de Sa Tuna",
  "Bañarte en la piscina del Marina Bay Sands",
  "Bañarte en los gorgs de la Garrotxa",
  "Bañarte en una playa de arena negra de Santorini",
  "Bucear en las islas Medes",
  "Bucear en Raja Ampat",
  "Caminar sobre un glaciar en Islandia",
  "Comer arroz en el Delta del Ebro",
  "Comer en el mercado de Toyosu",
  "Comer gambas de Palamós",
  "Comer suquet de peix en la Costa Brava",
  "Correr la Mitja de Granollers",
  "Correr la Ultra Pirineu",
  "Correr un encierro de San Fermín",
  "Dormir en el desierto de Wadi Rum",
  "Dormir en un bungalow sobre el agua en Bora Bora",
  "Dormir en un bungalow sobre el agua en Maldivas",
  "Escalar en Siurana",
  "Escalar una aguja de Montserrat",
  "Flotar en el mar Muerto",
  "Hacer barranquismo en la Noguera",
  "Hacer el Camí dels Bons Homes",
  "Hacer el Camino de Santiago desde Montserrat",
  "Hacer la ferrata de Boixadera dels Bancs",
  "Hacer la ferrata de Les Baumes",
  "Hacer la ferrata del Salt del Grill",
  "Hacer la Matagalls-Montserrat",
  "Hacer la ruta de las nueve ermitas del Montsant",
  "Hacer la Travessia del Port de Barcelona nadando",
  "Hacer la Vía Verde del Carrilet de Olot a Girona",
  "Hacer los Carros de Foc",
  "Hacer paddle surf en el cabo de Creus",
  "Hacer rafting por el Noguera Pallaresa",
  "Hacer un safari por el desierto de Dubái",
  "Jugar al Holi en India",
  "Mojarte en el Songkran",
  "Navegar entre los islotes de El Nido",
  "Navegar por el Amazonas",
  "Navegar por el delta del Ebro",
  "Navegar por el río Li en Guilin",
  "Navegar por la bahía de Ha Long",
  "Pasar un día en Ferrari Land",
  "Pasar un día en PortAventura",
  "Recorrer el Camí de Ronda entero",
  "Recorrer el GR-11 por el Pirineo catalán",
  "Recorrer el Parc Natural del Montseny",
  "Recorrer la Tarragona romana",
  "Recorrer la Vía Dolorosa",
  "Recorrer las islas Feroe",
  "Recorrer las murallas de Dubrovnik",
  "Recorrer las murallas de Montblanc",
  "Recorrer las Torres del Paine",
  "Recorrer los canales de Ámsterdam en barco",
  "Recorrer los túneles de Cu Chi",
  "Recorrer un mercado flotante de Tailandia",
  "Saltar en puenting en Queenstown",
  "Subir en bici a la Rabassa",
  "Subir en bici al Alpe d'Huez",
  "Subir en bici al Angliru",
  "Subir en bici al Mont Ventoux",
  "Subir en bici al Port del Cantó",
  "Volar en globo sobre la Capadocia",
  "Volar en globo sobre los volcanes de la Garrotxa"
])

export const TAMANO = '1024x1536'
export const MODELO = 'gpt-image-1'
export const CALIDAD = 'medium'

// ── CAMBIO 1 · La cara es ESTRUCTURA, no una recomendación ──
//
// «Sin caras reconocibles» no bastó: en la primera vuelta salieron caras de
// perfil bien iluminadas en karaoke, empresa y maratón. El modelo obedecía la
// prohibición pero no tenía ningún encuadre que poner en su lugar.
//
// Así que ya no se prohíbe una cara: se PIDE un encuadre concreto, y cada gooal
// lleva el suyo.
//
// ══ LA REGLA DE FONDO, Y ES LA RAZÓN DE TODO LO DEMÁS ═════
//
// La pregunta estaba mal planteada. Era «cómo enseño a una persona sin
// enseñarle la cara», y de ahí salieron cinco encuadres que son cinco maneras
// de esconder una cara. La pregunta correcta es otra:
//
//     Si el gooal se puede contar SIN una persona,
//     se cuenta SIN una persona.
//
// ── LA EXCEPCIÓN, QUE SE ENCONTRÓ MIRANDO ─────────────────
//
//     Si el gooal ES la acción y no hay objeto ni lugar que la cuente
//     —correr, saltar, escalar, nadar, bailar—, entonces la persona es la
//     respuesta correcta y lleva encuadre humano.
//
// Salió de tres pruebas que no estaban mal hechas y no decían el gooal: una
// manta térmica dorada, una roca de conglomerado y agua vista desde arriba.
// Maratón, escalada y puenting son acción, y al quitar la persona se quitó
// también lo que había que contar.
//
// **Lo que estaba mal nunca fue la persona: era la persona POR DEFECTO.** Un
// maratón al amanecer a contraluz dice «maratón» en medio segundo, y la
// silueta ni siquiera necesita cara.
//
// ── Y EL TERCER CAMINO, QUE NO ES NI UNA COSA NI OTRA ─────
//
// Cuatro fotos salieron correctas y no decían su gooal: una espalda con
// camiseta oscura al borde de una pasarela, alguien en el agua al atardecer.
// Se veía la persona y NO SE VEÍA lo que distingue ese gooal de otro
// parecido — una espalda es cualquiera, y alguien en el agua se está
// bañando.
//
//     Cuando ni el objeto solo ni la persona sola cuentan el gooal, el
//     sujeto es EL ELEMENTO QUE LO HACE ESE GOOAL, en primer plano, y la
//     persona entra de contexto.
//
// En el puenting ese elemento es la cuerda saliendo de unos tobillos, no el
// que salta. En una travesía a nado es la DISTANCIA —que no se vea la
// orilla—, no la brazada. Es un tercer camino y vale para más casos que
// esos cuatro: sirve siempre que dos gooals distintos darían la misma foto.
//
// Y no por variedad, que sería un motivo estético. Es por lo que la app es:
// **una lista de deseos trata de lo que va a hacer QUIEN MIRA.** Un sitio vacío
// le invita a entrar; la espalda de un desconocido ya le está ocupando el
// sitio. La foto tiene que dejarle hueco.
//
// Lo que esto corrigió, medido: 'espaldas' era el valor por defecto de deporte,
// naturaleza y viajes —las tres categorías más grandes— Y ADEMÁS el último
// recurso cuando nada encajaba. Dos caminos distintos al mismo sitio, y por eso
// medio catálogo iba a ser la misma foto. Esos tres valores por defecto ya no
// existen.
// ══ LA PRUEBA DE LA TARJETA ═══════════════════════════════
//
// Antes de dar por bueno un encuadre nuevo, o una foto:
//
//     Un encuadre vale si a 144 px se distingue UNA SOLA FORMA CON
//     CONTRASTE. Y se juzga sobre la tarjeta montada, CON el degradado y
//     el título encima, no sobre la imagen desnuda.
//
// 144 px es la tarjeta cuadrada de Explorar en una pantalla de 320. A
// pantalla completa todo parece bien, y esa no es la pregunta.
//
// Lo que esto descartó, mirando doce pruebas: una textura monocroma (una
// pared de sal gris es una mancha), un encuadre que pide una figura
// diminuta, y la luz de noche sin una lámpara dentro del cuadro.
//
// Y lo que hace falta para pasarla no es belleza: la gorgonia roja de las
// Medes se lee a 144 px porque es UNA forma roja sobre fondo oscuro.
const ENCUADRES = {
  espaldas: 'La persona está DE ESPALDAS a la cámara, se le ve la nuca y los hombros, nunca la cara.',
  hombros: 'El encuadre está RECORTADO POR LOS HOMBROS: se ven las manos, los brazos y el torso, y la cabeza queda fuera del encuadre por arriba.',
  // Comer necesita boca, y «la cabeza fuera del encuadre» lo hacía imposible.
  // Una regla que choca con el sujeto no da error: se incumple en silencio, y
  // el modelo resolvió el choque enseñando la cara entera. Así que a la comida
  // se le da un encuadre que SÍ puede cumplir: el plato y las manos, visto
  // desde arriba, sin persona.
  // Y AUN ASÍ SALIÓ UN TORSO. «Comer gambas de Palamós» (10-10-2026) tenía un
  // tronco desnudo detrás del plato, con piel a los dos lados, teniendo
  // escrito «ni torso» con todas las letras. Otra vez lo mismo: prohibir no
  // sustituye a describir, y «las manos DE QUIEN VA A COMER» invoca a alguien
  // entero que el modelo dibuja aunque le digas que no. Por eso ahora la
  // composición es una en la que no cabe: manos cortadas por la muñeca que
  // entran por el borde del cuadro.
  //
  // PERO «NI TORSO» ERA MÁS ESTRICTO QUE SU PROPIO PROPÓSITO. Lo que esta
  // regla protege es LA CARA; el «ni torso» era un apretón para que el modelo
  // no se deslizara hacia ella, y de rebote condenaba fotos buenas: la del
  // cuy —unas manos con cuchillo y tenedor y un cuerpo VESTIDO detrás— se
  // entiende al instante y no enseña a nadie.
  //
  // Así que la línea está donde de verdad estaba: ni cara, ni piel desnuda que
  // se convierta en el asunto. Un cuerpo vestido de contexto detrás del plato
  // no rompe nada. Las gambas seguirían siendo un fallo, que es como debe ser.
  plato: 'Encuadre cenital, la cámara justo encima y mirando a plomo: llenan el cuadro el plato y la mesa, que son el asunto. Si hay manos, ENTRAN POR EL BORDE del encuadre y están CORTADAS POR LA MUÑECA. NO SE VE NINGUNA CARA, ni boca, ni ningún trozo de piel desnuda que llame la atención: si detrás del plato asoma alguien, va vestido y queda en penumbra, de contexto.',
  contraluz: 'La persona está A CONTRALUZ y sale como una SILUETA oscura y limpia contra la luz: no se le distingue ni un rasgo de la cara.',
  casco: 'La persona lleva CASCO Y GAFAS que le tapan la cara por completo, y además está en pleno movimiento.',

  // ── Los seis SIN persona, que son los que hay que preferir ──
  // Y QUE LLENE AL MENOS LA MITAD DEL ALTO. «Practicar pádel» falló dos
  // veces igual: la escena pedía una pala y una pelota en el suelo, y el
  // modelo pintó la pista. Si el objeto es pequeño dentro del cuadro, el
  // sujeto pasa a ser el sitio sin que nadie lo haya pedido.
  objeto: 'En la foto NO HAY NINGUNA PERSONA. Se ve solo el objeto que cuenta el gooal, en su sitio real, como si quien lo usa acabara de irse. EL OBJETO OCUPA AL MENOS LA MITAD DEL ALTO del encuadre: es el sujeto, no un detalle del decorado.',
  // SOLO SI EL ASUNTO TIENE SILUETA. Medido en doce pruebas: la moneda de
  // la Fontana y la gorgonia de las Medes se leen a 144 px porque tienen
  // forma; la pared de sal de Cardona y la roca de Montserrat no, porque
  // son TEXTURA, y una textura a ese tamaño es una mancha.
  detalle: 'Primerísimo plano de UNA sola pieza con silueta reconocible, tan cerca que el resto de la escena no se ve, y recortada con claridad contra un fondo que contrasta. NO HAY NINGUNA PERSONA.',
  lugar_vacio: 'El lugar donde pasa el gooal, COMPLETAMENTE VACÍO de gente. NO HAY NINGUNA PERSONA, ni de lejos.',
  primera_persona: 'La cámara está DONDE ESTARÍAN LOS OJOS de quien lo vive: se ve lo que ve. De su cuerpo no se ve nada, o como mucho las manos en primer plano por el borde de abajo.',
  manos: 'Se ven ÚNICAMENTE LAS MANOS haciendo la acción, desde cerca. Ni cara, ni cabeza, ni torso, ni hombros.',
  // RETIRADO el 10-10-2026: existió "silueta_lejana", una figura diminuta
  // dentro de un paisaje grande. Lo tumbaron DOS razones independientes, y
  // por eso no se intentó arreglar:
  //
  //   1. El modelo no hace pequeño a su protagonista. Las dos pruebas
  //      fallaron: en «Correr un maratón» metió la cara de una señora
  //      ocupando media foto, y en «Escalar una aguja de Montserrat» una
  //      cara iluminada ocupando un tercio.
  //   2. Y aunque obedeciera: una figura de menos de una décima del alto,
  //      en una tarjeta de 144 px, NO SE VE. El encuadre es incompatible
  //      con el tamaño al que se mira.
  //
  // Sus 14 gooals están repartidos uno a uno en decisiones.mjs.
}

/**
 * QUÉ ENCUADRES LLEVAN PERSONA. No es documentación: lo usa el prompt.
 *
 * Seis de los once NO tienen a nadie. Si la rotación de quién sale («una mujer
 * de unos 30») se le cuela al prompt de una pista de atletismo vacía, **va a
 * aparecer una mujer en la pista y no va a dar ningún error**: es exactamente
 * lo que pasó con 'comer' y 'hombros', una regla que choca con el sujeto no
 * falla, se incumple en silencio.
 *
 * Tres grupos, porque hay un término medio:
 *
 *   CUERPO     se ve una persona entera o media → lleva la frase completa.
 *   SOLO_MANOS se ven manos y nada más → la rotación describe LAS MANOS, que
 *              si no vuelven a ser siempre las mismas manos.
 *   NADIE      no hay nadie → no se nombra a ninguna persona, ni de refilón.
 */
/**
 * QUÉ EJES FIJA YA CADA ENCUADRE, y por lo tanto cuáles NO puede recibir.
 *
 * Cinco de los nueve traen puesto un eje en su propio texto. Si el eje de
 * cámara le pone otro, el prompt dice dos cosas distintas sobre lo mismo en
 * dos frases seguidas, y gana una en silencio. Pasó tal cual con «Comer en
 * un hawker centre»:
 *
 *     «Encuadre cenital sobre la mesa... La cámara mira hacia abajo.
 *      La cámara está A LA ALTURA DE LOS OJOS de quien estuviera de pie.»
 *
 * Medido sobre las cuarenta de la tanda del 10-10, cruzando el choque con
 * el veredicto de mirarlas una a una:
 *
 *     sin choque: 7 funcionan, 4 dudosas, 0 fallan
 *     con choque: 3 funcionan, 5 dudosas, 4 fallan
 *
 * **Las cuatro que fallan tienen choque, y ninguna sin choque falla.** No
 * es que el choque lo estropee siempre —tres con choque salieron bien—, es
 * que nunca ayuda y a veces rompe. Por eso esto no avisa: falla.
 */
const EJE_QUE_FIJA = {
  plato: 'angulo',            // «encuadre cenital... la cámara mira hacia abajo»
  primera_persona: 'angulo',  // «la cámara está donde estarían los ojos»
  detalle: 'angulo',          // «tan cerca que el resto no se ve»
  manos: 'angulo',            // «desde cerca»
  contraluz: 'luz',           // «a contraluz»: la luz viene de detrás, y eso ES la luz
}

const CUERPO = new Set(['espaldas', 'hombros', 'contraluz', 'casco'])
const SOLO_MANOS = new Set(['manos', 'plato'])

// El encuadre de cada gooal. Lo elijo yo mirando qué tiene sentido en esa
// escena: a un esquiador se le pone casco porque lo lleva de verdad, y a quien
// come se le recorta por los hombros porque lo que importa son las manos y el
// plato.
/** Los encuadres de decisiones.mjs, para mezclarlos abajo. */
const ENCUADRE_DECIDIDO = Object.fromEntries(
  Object.entries(DECIDIDOS).map(([titulo, [encuadre]]) => [titulo, encuadre]),
)
/** Y sus escenas. Las que van con null ya tienen una escrita más abajo. */
const ESCENA_DECIDIDA = Object.fromEntries(
  Object.entries(DECIDIDOS)
    .filter(([, [, escena]]) => escena)
    .map(([titulo, [, escena]]) => [titulo, escena]),
)

/**
 * El encuadre de cada gooal: TODO sale de decisiones.mjs y de ningún otro
 * sitio. Aquí no se escribe ninguno.
 *
 * Hubo un ENCUADRE_DE propio en este fichero y era una segunda fuente de
 * verdad: cuando un título estaba en los dos, ganaba este sin decir nada. Lo
 * cazó el contador del reparto por casualidad, porque los números no
 * cuadraban — que es la peor manera de enterarse.
 */
const ENCUADRE_DE = ENCUADRE_DECIDIDO

// ── QUIÉN SALE EN LA FOTO, por turno y no al azar ──────────
//
// Las 16 de la segunda ronda eran hombres. Las ocho escenas, las dos vueltas,
// todas. Sobre 260 tarjetas eso canta, y la mitad de los usuarios no son
// hombres.
//
// La solución NO es pedir «a veces una mujer»: eso lo deja al azar del modelo,
// que es justo el azar que produjo 16 hombres seguidos. Se reparte POR TURNO,
// según la posición del gooal en la lista: seis variantes, tres mujeres y tres
// hombres, tres franjas de edad. Con eso el reparto es exacto y no depende de
// la suerte.
const PERSONAS = [
  'una mujer joven',
  'un hombre de mediana edad',
  'una mujer mayor',
  'un hombre joven',
  'una mujer de mediana edad',
  'un hombre mayor',
]

// Y que no sean todos atléticos. En esquí o en una maratón un cuerpo de
// deportista es lo natural; en un karaoke, comiendo o durmiendo, no — y si
// todas las fichas enseñan a alguien en forma, el catálogo dice sin querer que
// esto es para gente en forma.
const CUERPO_CORRIENTE = 'de complexión corriente, ni atlética ni de modelo.'

// ── CAMBIO 2 · Prohibido POR SU NOMBRE lo que se coló ──────
//
// «Ni una letra» no bastó ni en la A ni en la C: la A colgó un cartel que ponía
// «Open» y la C puso dos líneas de texto en la pantalla del karaoke. Un modelo
// de imagen no entiende «letra» como categoría; entiende objetos. Así que se
// prohíben los OBJETOS que traen letras.
const PROHIBIDO = [
  'PROHIBIDO que aparezca ninguno de estos objetos:',
  'carteles, rótulos, letreros, señales, placas, menús, pizarras, libros abiertos,',
  'dorsales o petos con número legible, camisetas con estampado, etiquetas, envases con marca,',
  'pantallas, televisores o monitores encendidos con texto,',
  'y ninguna palabra, letra, número, logotipo, marca de agua ni firma en ninguna parte.',
].join(' '),

// ── Lo que vale para todos, para que la comparación sea justa ──
  COMUNES = [
  'Formato vertical.',
  'El sujeto va centrado y con aire a los lados, porque la imagen se recorta por los lados al mostrarse.',
  'Sin bordes, sin marco, sin collage: una sola escena que llena todo el encuadre.',
  // EL TERCIO INFERIOR ES DEL TÍTULO. Sobre la tarjeta va un degradado
  // oscuro y encima el nombre del gooal, así que lo que caiga ahí abajo se
  // pierde. Pasó con «Sacarte el cinturón negro»: la imagen era correcta y
  // el cinturón, que es el asunto, quedaba tapado por su propio título.
  'EL ASUNTO DE LA FOTO VA EN LOS DOS TERCIOS DE ARRIBA del encuadre: el tercio inferior se tapa después con un texto, así que ahí abajo no puede estar lo importante.',
].join(' ')

// ── CAMBIO 3 · Los abstractos llevan la escena ESCRITA ─────
//
// «Montar tu propia empresa» salió distinto en cada vuelta —una tecleando, otra
// colgando el cartel de abierto— porque le dejábamos elegir. En un gooal que no
// tiene nada que fotografiar, la escena no la puede escoger el modelo: la
// escribo yo, una sola, y se repite siempre.
//
// Son 14 gooals de 541 (un 2,6%), así que escribirlas a mano es asumible y es
// lo único que da consistencia donde no hay nada real que retratar.
//
// ── Y TAMBIÉN LOS TÍTULOS QUE NIEGAN ALGO ─────────────────
//
// Hay un segundo grupo que necesita escena escrita por otra razón: cuando el
// título NIEGA o CONDICIONA algo, una escena corriente puede decir lo
// contrario sin que nadie lo note.
//
// Pasó con «Dormir en una cabaña sin electricidad»: salió con una lámpara
// eléctrica encendida, con su pantalla de tela, en LAS DOS vueltas. La foto
// decía justo lo contrario que el título, y el modelo no tenía forma de saberlo
// porque «sin electricidad» no describe nada que se vea: describe algo que NO
// está. Una ausencia no se fotografía; hay que poner en su lugar lo que sí
// está, que aquí es una vela.
//
// Se barrió el catálogo entero buscando más. Salieron seis candidatos y tres
// eran falsos positivos (los «desierto», donde el desierto es el sitio y no una
// negación). Los tres de verdad llevan su escena aquí abajo.
export const ESCENAS = {
  ...ESCENA_DECIDIDA,
  // Las de «Practicar X»: el objeto de cada deporte, escrito uno a uno. Sin
  // esto, un encuadre sin persona se queda sin sujeto y lo elige el modelo.
  "Practicar CrossFit": "Una barra olímpica cargada de discos, apoyada en el suelo de goma de un box, con el polvo de magnesio alrededor y las anillas colgando al fondo, desenfocadas.",
  "Practicar golf": "Una bola blanca sobre el tee, recién colocada en la hierba cortada al ras, con la cabeza del palo detrás y el green perdiéndose desenfocado.",
  "Practicar pádel": "Encuadre recortado por los hombros: el torso y el brazo de alguien en el momento de golpear con una pala de pádel, con la pared de cristal de la pista detrás.",
  "Practicar tenis": "Una raqueta apoyada en la red y una pelota amarilla parada sobre la tierra batida, con la marca de la línea blanca al lado.",
  "Practicar hípica": "Una silla de montar de cuero y unas riendas colgadas de la valla de madera de un picadero de arena.",
  "Practicar surf": "Una tabla de surf clavada en la arena mojada al borde del agua, con la cera marcada y la quilla a la vista.",
  "Practicar windsurf": "Una vela de windsurf montada y apoyada en la orilla, con la tabla al lado y el agua picada detrás.",
  "Practicar kitesurf": "Una cometa de kitesurf desinflada sobre la arena al final del día, con las líneas recogidas y la tabla encima.",
  "Practicar wakeboard": "El mango y la cuerda de arrastre flotando en el agua quieta, con la estela todavía marcada detrás.",
  "Practicar paddle surf": "Un remo apoyado en diagonal sobre una tabla de paddle surf, flotando en agua lisa como un espejo.",
  "Practicar snowboard": "Una tabla de snowboard clavada de pie en la nieve virgen, con las fijaciones abiertas y la montaña desenfocada detrás.",
  "Practicar esquí de travesía": "Dos esquís de travesía clavados en la nieve con las pieles de foca todavía puestas, y los bastones cruzados al lado.",
  "Practicar escalada en roca": "Unos pies de gato gastados y una bolsa de magnesio abierta, al pie de una vía, sobre la roca.",
  "Practicar escalada en hielo": "Primerísimo plano de la punta de un piolet clavada en hielo azul, con las esquirlas saltadas alrededor.",
  "Practicar motocross": "Primerísimo plano del surco que ha dejado un neumático de tacos en el barro mojado, con las salpicaduras al lado.",
  "Practicar patinaje sobre hielo": "Primerísimo plano de las marcas curvas que dejan las cuchillas sobre el hielo recién pulido.",
  "Practicar escalada en rocódromo": "Un muro de rocódromo lleno de presas de colores, visto de frente y COMPLETAMENTE VACÍO, con las colchonetas abajo.",
  "Practicar esquí": "Las puntas de dos esquís asomando por abajo del encuadre y la pendiente abriéndose delante, nieve y pinos, sin nadie más.",
  "Practicar vela": "La proa de un velero escorado y el mar abierto delante, visto desde la bañera, con la escota tensa entrando por un lado.",

  'Montar tu propia empresa':
    'Dos manos abriendo la persiana metálica de un local pequeño a primera hora, con cajas de cartón aún sin abrir dentro.',
  // La versión anterior decía «un examen terminado» y salió con la hoja llena
  // de texto impreso: un examen ES texto. Se le da la vuelta a la hoja.
  'Sacarte el C1 de inglés':
    'Una hoja de examen VUELTA DEL REVÉS sobre un pupitre, de modo que solo se ve el dorso en blanco del papel, sin una sola letra, con un bolígrafo encima. El aula está vacía, junto a una ventana, con luz de tarde. NO HAY NINGUNA PERSONA.',

  // ── Tres que reclamaban su sitio o metían una marca ──────
  // El encuadre cerrado no bastó: el modelo metió el edificio, el escudo de la
  // marca y un periódico. Cuando una escena tiene un elemento que TIRA de lo
  // prohibido, hay que escribir la escena sin ese elemento, no repetir la
  // prohibición.
  'Bañarte en la piscina del Marina Bay Sands':
    'Alguien de espaldas apoyado en el borde de una piscina infinita en altura, con el agua desbordando por el canto de piedra. Detrás solo hay cielo y una ciudad completamente desenfocada: NO se ve ningún edificio reconocible, ni torres, ni una azotea con forma.',
  'Flotar en el mar Muerto':
    'Alguien flotando boca arriba en agua densa y turquesa, con las rodillas y las manos asomando por encima de la superficie y costras de sal blanca en la orilla. NO sostiene nada: ni periódico, ni libro, ni papel, ni revista.',
  'Pasar un día en Ferrari Land':
    'El rizo rojo de una montaña rusa visto desde abajo contra el cielo, con un vagón pasando por lo alto y los brazos de la gente levantados. Ni un logotipo, ni un escudo, ni un emblema, ni una marca en ninguna parte.',
  'Publicar un libro':
    'Un libro recién impreso, cerrado y sin nada escrito en la cubierta, sobre una mesa de madera junto a una ventana. NO HAY NINGUNA PERSONA.',
  'Terminar un máster':
    'Alguien de espaldas bajando la escalinata de piedra de una facultad con una carpeta bajo el brazo.',
  'Vivir un año en otro país':
    'Alguien de espaldas en el balcón de un piso extranjero al atardecer, con una maleta todavía abierta detrás.',
  'Sacarte el cinturón negro':
    'Solo unas manos atando el nudo de un cinturón negro sobre un kimono blanco, de cerca, con un tatami vacío desenfocado detrás.',
  // La escena vieja decía «delante de una pizarra llena de fórmulas» y salió
  // con las fórmulas escritas y legibles. No se coló el texto: lo pedía la
  // escena. Cuando la escena obvia NECESITA texto, no se endurece la
  // prohibición — se cambia de escena.
  'Doctorarte':
    'Un birrete negro con su borla dejado sobre el respaldo de una silla de madera, junto a un diploma enrollado y atado con una cinta. El diploma está enrollado y no se ve nada escrito en ninguna parte. NO HAY NINGUNA PERSONA.',
  // Igual: una carrera con la distancia en el nombre pide un dorsal, y un
  // dorsal sin número no es nada. Se quitan los dorsales de la escena.
  'Correr un 10K':
    'Varios corredores DE ESPALDAS por una carretera al amanecer, con la carretera abriéndose delante. NINGUNO lleva peto ni dorsal: van con camiseta lisa.',
  'Terminar una carrera universitaria':
    'Un birrete lanzado al aire contra el cielo, visto desde abajo.',
  'Sacarte el carnet de moto':
    'Unas manos con guantes poniéndose el casco junto a una moto parada en un circuito de prácticas.',
  'Sacarte el título de buceo Open Water':
    'Un buceador visto desde abajo, en silueta contra la superficie iluminada del agua.',
  'Sacarte el título de patrón de embarcaciones':
    'Unas manos sobre la rueda del timón de una embarcación pequeña, con el mar abierto delante.',
  'Sacarte la licencia de piloto':
    'Unas manos sobre los mandos de una avioneta pequeña, con la pista delante a través del parabrisas.',
  'Mudarte a otro continente':
    'Alguien de espaldas empujando un carro de maletas por una terminal de aeropuerto casi vacía.',
  'Hacer un voluntariado en el extranjero':
    'Varias manos pasándose cajas en fila, al aire libre, sin que se vea ninguna cara.',

  'Hacer una cata de whisky en una destilería':
    'Tres copas de cata alineadas sobre una barrica, con las manos de alguien levantando una a la altura de la nariz. Detrás, la nave de una destilería con las barricas apiladas. NO hay comida de ninguna clase en la escena.',

  // ── Los tres que niegan algo ────────────────────────────
  'Dormir en una cabaña sin electricidad':
    'El interior de una cabaña de madera de noche, alumbrado SOLO por una vela encendida sobre la mesilla y el resplandor de la chimenea. NO hay ninguna lámpara, ni bombilla, ni enchufe, ni cable, ni interruptor en toda la escena: la cabaña no tiene electricidad y eso se tiene que ver. Alguien acostado bajo las mantas.',
  'Probar el pulpo vivo':
    'Un plato de tentáculos de pulpo todavía MOVIÉNDOSE, con las ventosas agarradas al borde del plato, y unos palillos a punto de coger uno. El pulpo está crudo y vivo: no está cocinado, ni rojo, ni a la brasa.',
  'Ir a unos Juegos Olímpicos de invierno':
    'Una grada llena de gente abrigada viendo una prueba sobre NIEVE Y HIELO, al aire libre, con la pista blanca abajo y montañas nevadas al fondo. Es invierno y eso manda en toda la escena.',
}

/**
 * Los gooals que no tienen nada que fotografiar. NO es `Object.keys(ESCENAS)`:
 * en ese mapa también están los tres que niegan algo, que sí son fotografiables
 * y solo necesitan que la escena diga lo que el título niega.
 */
export const ABSTRACTOS = [
  'Montar tu propia empresa', 'Sacarte el C1 de inglés', 'Publicar un libro',
  'Terminar un máster', 'Vivir un año en otro país', 'Sacarte el cinturón negro',
  'Doctorarte', 'Terminar una carrera universitaria', 'Sacarte el carnet de moto',
  'Sacarte el título de buceo Open Water', 'Sacarte el título de patrón de embarcaciones',
  'Sacarte la licencia de piloto', 'Mudarte a otro continente',
  'Hacer un voluntariado en el extranjero',
]

// ── Los estilos ───────────────────────────────────────────
export const ESTILOS = {
  A: {
    nombre: 'Fotográfico editorial',
    resumen: 'Foto de revista de viajes. Tratamiento fijo; la temperatura la pone la escena.',
    // EL TRATAMIENTO ES FIJO, LA TEMPERATURA NO.
    //
    // La segunda ronda fijó «luz cálida de tarde» y compró consistencia, pero
    // pagándola con una mentira: el glaciar de Islandia salía color duna,
    // porque la nieve en ámbar se lee como arena. Un gooal que dice glaciar no
    // puede salir desierto.
    //
    // Fijar la temperatura es elegir el color de todas las escenas desde fuera,
    // y eso acaba contradiciendo a alguna. Lo que de verdad daba coherencia —y
    // esto se vio en la C— no era el color: era que todas compartieran
    // TRATAMIENTO. Así que se fija el tratamiento (una luz, sol bajo, grano,
    // saturación contenida, nada de HDR) y la temperatura la pone la escena: la
    // nieve sale fría porque la nieve es fría.
    bloque: [
      'Fotografía editorial de revista de viajes.',
      'TRATAMIENTO FIJO, el mismo en todas: UNA SOLA fuente de luz principal, fuerte y direccional, de sol bajo o de la luz que de verdad haya en ese sitio.',
      'LA TEMPERATURA DE COLOR LA PONE LA ESCENA y no se fuerza: la nieve y el hielo salen fríos y azulados, el interior de noche sale cálido. Nada de dar un tono dorado a lo que no lo tiene.',
      'Saturación contenida, sin aplanar las sombras, sin HDR, sin ese brillo parejo de foto de postal o de folleto.',
      'Grano fino de película y profundidad de campo de objetivo rápido.',
      'Un instante que está ocurriendo, no una pose: nadie mira a cámara.',
      'La escena transmite ganas de hacerlo: es un buen momento, no un momento duro ni solitario.',
      'Nada de aspecto de banco de imágenes: ni ropa nueva, ni escenario ordenado, ni gente posando.',
    ].join(' '),
  },
  B: {
    nombre: 'Ilustración plana',
    resumen: 'Formas grandes, pocos colores, la paleta de la marca.',
    bloque: [
      'Ilustración vectorial plana, geométrica, de formas grandes y simples.',
      'Sin degradados, sin sombras suaves, sin texturas, sin contornos dibujados: solo manchas de color planas.',
      'PALETA CERRADA, exactamente estos cuatro colores y ninguno más: negro casi puro #0B0B0B, verde menta luminoso #00D1A7, blanco roto #F5F5F2 y gris verdoso apagado #7A8A85.',
      'EL FONDO ES SIEMPRE el negro #0B0B0B, nunca claro, y el sujeto se dibuja en blanco roto y verde menta para que destaque con fuerza sobre él.',
      'Nada de verde oscuro sobre negro: lo que tenga que leerse va en blanco roto.',
      'Las figuras son siluetas simplificadas sin rasgos faciales.',
      'Composición de cartel: mucho aire, pocos elementos, una idea sola y reconocible a tamaño pequeño.',
    ].join(' '),
  },
}

// ── CUANDO VARIOS GOOALS COMPARTEN ACCIÓN ─────────────────
//
// Cinco puertos de montaña en bici, tres ferratas, seis navegaciones. Con la
// regla del encuadre cerrado —sin el sitio reconocible— las cinco fotos de
// puerto salen casi iguales. Y cinco imágenes gemelas seguidas en Descubrir no
// se leen como «la misma acción»: se leen como un error de duplicado.
//
// La variación NO va en el sitio. Meter el Angliru reconocible rompería la
// regla que justifica el encuadre cerrado. **Va en el MOMENTO de la acción**:
// mismo estilo, mismo tratamiento, distinta foto.
//
// Cada gooal recibe el momento que le toca por su posición dentro de su grupo,
// igual que las personas: por turno y no al azar.
const MOMENTOS = {
  'puertos en bici': [
    'Visto DESDE DETRÁS y muy cerca: el manillar, los brazos y la rampa subiendo delante.',
    'Visto DE PERFIL en una curva de herradura, con la bici inclinada en el giro.',
    'Visto DESDE ARRIBA, con las lazadas de la carretera pequeñas allá abajo.',
    'Bajo la LLUVIA, con el asfalto mojado y la rueda levantando agua.',
    'AL AMANECER y a CONTRALUZ, la silueta recortada contra el sol bajo.',
  ],
  'ferratas': [
    'Visto DESDE ARRIBA, mirando hacia abajo al cable y a las manos que lo agarran.',
    'Visto DE PERFIL, cruzando un puente de cable tendido en el vacío.',
    'MUY CERCA de las manos con el mosquetón en la línea de vida.',
  ],
  'navegar': [
    'Visto DESDE LA PROA, con el agua abriéndose delante.',
    'Visto DESDE DENTRO de la embarcación, sobre el hombro de quien gobierna.',
    'Visto DESDE ARRIBA, la estela de la barca sobre el agua.',
    'AL ATARDECER y a CONTRALUZ, la silueta de la barca contra el agua encendida.',
    'MUY CERCA del agua, a ras de superficie.',
    'CON NIEBLA baja sobre el agua.',
  ],
  'parejas': [
    'Visto DE CERCA y en pleno gesto.',
    'Visto DESDE ARRIBA, con la escena pequeña y mucho aire alrededor.',
  ],
  'comer un plato local': [
    'Con el plato recién servido y los cubiertos todavía quietos.',
    'A media comida, el plato ya empezado.',
    'Con las manos partiendo o sirviendo una ración.',
    'Con el vapor todavía saliendo del plato.',
  ],
  'carreras a pie': [
    'DESDE DETRÁS del grupo, viendo la carretera abrirse.',
    'DE PERFIL y muy cerca, las piernas en pleno zancada.',
    'DE NOCHE, con los frontales encendidos en fila.',
  ],
}

// Qué gooals forman cada grupo, en el orden en que se reparten los momentos.
const GRUPOS = {
  'puertos en bici': ['Subir en bici al Angliru', 'Subir en bici al Mont Ventoux',
    "Subir en bici al Alpe d'Huez", 'Subir en bici a la Rabassa', 'Subir en bici al Port del Cantó'],
  'ferratas': ['Hacer la ferrata de Boixadera dels Bancs', 'Hacer la ferrata de Les Baumes',
    'Hacer la ferrata del Salt del Grill'],
  'navegar': ['Navegar por el Amazonas', 'Navegar por la bahía de Ha Long',
    'Navegar entre los islotes de El Nido', 'Navegar por el río Li en Guilin',
    'Navegar por el delta del Ebro', 'Navegar por los fiordos noruegos'],
  'parejas': ['Dormir en un bungalow sobre el agua en Bora Bora', 'Dormir en un bungalow sobre el agua en Maldivas',
    'Volar en globo sobre la Capadocia', 'Volar en globo sobre los volcanes de la Garrotxa',
    'Pasar un día en PortAventura', 'Pasar un día en Ferrari Land',
    'Recorrer las murallas de Dubrovnik', 'Recorrer las murallas de Montblanc',
    'Terminar un Ironman', 'Terminar un medio Ironman'],
  'comer un plato local': ['Comer gambas de Palamós', 'Comer suquet de peix en la Costa Brava',
    'Comer arroz en el Delta del Ebro', 'Comer en el mercado de Toyosu'],
  'carreras a pie': ['Correr la Mitja de Granollers', 'Correr la Ultra Pirineu', 'Hacer la Matagalls-Montserrat'],
}

// 'parejas' va de dos en dos: cada pareja empieza por el primer momento.
const momentoDe = titulo => {
  for (const [grupo, lista] of Object.entries(GRUPOS)) {
    const i = lista.indexOf(titulo)
    if (i < 0) continue
    const m = MOMENTOS[grupo]
    return grupo === 'parejas' ? m[i % 2] : m[i % m.length]
  }
  return null
}


/** Cómo se dice cada ángulo en el prompt. */
const ANGULOS = {
  "cenital": "La cámara mira A PLOMO DESDE ARRIBA, perpendicular al suelo.",
  "a ras de suelo": "La cámara está A RAS DE SUELO, muy baja, casi apoyada.",
  "a la altura de los ojos": "La cámara está A LA ALTURA DE LOS OJOS de quien estuviera allí de pie.",
  "contrapicado": "La cámara mira HACIA ARRIBA desde abajo, en contrapicado.",
  "desde muy cerca": "La cámara está MUY CERCA del sujeto, a un palmo, con poca profundidad de campo.",
}

/** Y cada luz. Ninguna es la de por defecto: cada gooal lleva la suya. */
const LUCES = {
  "amanecer": "Luz de AMANECER, rasante y tibia, con sombras largas.",
  "mediodía duro": "Luz de MEDIODÍA, dura y vertical, con sombras cortas y marcadas y mucho contraste.",
  "tarde larga": "Luz de TARDE LARGA, baja y cálida, poco antes de ponerse el sol.",
  // Siempre con una fuente de luz DENTRO del cuadro: sin ella, a tamaño
  // de tarjeta es un rectángulo negro, y «Correr un ultratrail» lo demostró.
  // RETIRADA el 10-10-2026, como silueta_lejana y por lo mismo: no pasa la
  // prueba de la tarjeta. Se intentó salvarla pidiendo una fuente de luz
  // dentro del cuadro y «Correr un ultratrail» volvió a salir negro al 90 %
  // a 179 px. Lo nocturno de verdad se cuenta con "interior", que tiene luz
  // propia y sí se lee.
  "interior": "EN INTERIOR, con luz que entra por una ventana o de lámparas, sin cielo.",
  "día nublado": "Día NUBLADO y plano, con luz difusa y sin sombras marcadas.",
}

/**
 * El prompt de un gooal en un estilo. Se arma por partes para que se vea de
 * dónde sale cada trozo: la escena, el contexto, el encuadre de la cara, lo
 * prohibido, las reglas comunes y el estilo.
 *
 * EL SUJETO ES LA ACCIÓN, NO EL DECORADO. Es la regla que ya está en CLAUDE.md
 * («Un gooal es una experiencia, no un sitio»): «Subir al Angliru» es una bici
 * subiendo, no la montaña. Por eso el lugar entra como CONTEXTO y se dice
 * expresamente que no sea el sujeto.
 */
export function construirPrompt(gooal, clave, indice = 0) {
  const estilo = ESTILOS[clave]
  if (!estilo) throw new Error('no existe el estilo ' + clave)

  const partes = []

  const encuadre = encuadreDe(gooal)

  // ── QUIÉN SALE, Y SOLO SI SALE ALGUIEN ──────────────────
  //
  // Por turno y no al azar: el índice es la posición del gooal en la lista
  // ordenada por título, así el reparto es exacto y no depende de la suerte.
  //
  // Y SOLO en los encuadres que llevan a alguien. Seis de los once no tienen
  // persona, y meterle «una mujer de unos 30» al prompt de una pista de
  // atletismo vacía **pondría una mujer en la pista sin dar ningún error**:
  // una instrucción que choca con el sujeto no falla, se incumple en silencio.
  // Es el mismo fallo que enseñó caras comiendo.
  const persona = PERSONAS[indice % PERSONAS.length]
  if (CUERPO.has(encuadre)) {
    partes.push('Quien aparece en la foto es ' + persona +
      (gooal.categoria === 'deporte' ? '.' : ', ' + CUERPO_CORRIENTE))
  } else if (SOLO_MANOS.has(encuadre)) {
    // Se ven manos y nada más, pero son las manos de alguien: sin esto vuelven
    // a ser siempre las mismas manos, que es el problema de origen.
    partes.push('Las manos que se ven son de ' + persona + '.')
  }

  // ── EL ENCUADRE CERRADO, para los que llevan un sitio reconocible ──
  //
  // Si el título nombra un sitio que alguien podría reconocer —el Pedraforca,
  // Wadi Rum, el Angliru—, la foto generada NO puede enseñarlo: sería una
  // montaña parecida pero falsa. Se cierra el encuadre sobre la acción y el
  // sitio se queda fuera.
  //
  // Lo que NO cuenta como sitio: Michelin, Ironman, Hyrox, el C1, el Open
  // Water. Son marcas, niveles y certificaciones, y nadie mira una foto y dice
  // «ese no es el Ironman».
  const cerrado = CON_SITIO_RECONOCIBLE.has(gooal.titulo)

  // Si tiene escena escrita, manda ella. Si no, la acción del título.
  const escena = ESCENAS[gooal.titulo]
  if (escena) {
    partes.push(escena)
    partes.push('Esta escena es FIJA: siempre esta y no otra.')
  } else {
    partes.push(`La acción de «${gooal.titulo}», ocurriendo.`)
    // Con el encuadre del plato NO se pide ver a nadie: pedir las dos cosas es
    // el mismo choque que enseñaba caras comiendo. Una regla que contradice al
    // sujeto no da error, se incumple en silencio.
    // Pedir «que se vea a alguien haciéndolo» con un encuadre SIN persona es
    // el mismo choque de siempre, así que cada grupo pide lo suyo.
    partes.push(
      encuadre === 'plato' ? 'EL SUJETO ES LA COMIDA en sí, en el plato, tal como se sirve.'
      : encuadre === 'objeto' ? 'EL SUJETO ES EL OBJETO en sí, y no hay nadie en la foto.'
      : encuadre === 'detalle' ? 'EL SUJETO ES LA TEXTURA o la pieza, de muy cerca, y no hay nadie en la foto.'
      : encuadre === 'lugar_vacio' ? 'EL SUJETO ES EL SITIO, vacío, esperando a que alguien llegue.'
      : encuadre === 'primera_persona' ? 'EL SUJETO ES LO QUE SE VE desde los ojos de quien lo vive.'
      : encuadre === 'manos' ? 'EL SUJETO ES EL GESTO DE LAS MANOS haciéndolo.'
      : 'EL SUJETO ES LA ACCIÓN, no el lugar ni el objeto: se tiene que ver a alguien haciéndolo.')
    // El lugar se nombra SOLO si no vamos a cerrar el encuadre. Pedir las dos
    // cosas —«que se note el entorno» y «que no se vea el lugar»— es el mismo
    // choque de instrucciones que ya enseñó caras comiendo: no da error, se
    // incumple en silencio y decide el modelo.
    if (!cerrado && gooal.ambito === 'lugar' && (gooal.ciudad || gooal.pais)) {
      const donde = [gooal.ciudad, gooal.pais].filter(Boolean).join(', ')
      partes.push(`Ocurre en ${donde}, y eso se nota en el entorno, pero el entorno es contexto y no el tema.`)
    }
    // El contexto de categoría habla de «una persona dentro que da la medida» y
    // cosas así: no se le pone a los encuadres que no llevan a nadie.
    partes.push(CUERPO.has(encuadre) ? (CONTEXTO_CATEGORIA[gooal.categoria] ?? '') : '')
  }

  // EL ENCUADRE VA SIEMPRE.
  //
  // Hubo una versión que se lo saltaba cuando la escena escrita «ya decía qué
  // se ve» —unas manos, un birrete, corredores de espaldas—. Era falso, y se
  // midió: «Probar el pulpo vivo» y «Doctorarte» salieron con la cara entera, y
  // «Hacer un voluntariado» también, pese a que su escena decía literalmente
  // «sin que se vea ninguna cara».
  //
  // Una escena describe LO QUE HAY; el encuadre dice QUÉ ENTRA EN LA FOTO. No
  // son lo mismo, y describir un birrete no impide que el modelo añada a quien
  // lo sostiene. Lo que sí hay que vigilar es que no se contradigan: por eso
  // las escenas de objeto llevan escrito 'hombros', que es compatible con unas
  // manos sosteniendo algo.
  partes.push(ENCUADRES[encuadre])

  // ── Y el cerrado SOLO si hay alguien a quien encerrar ────
  //
  // «Dormir en un bungalow sobre el agua en Bora Bora» pedía las dos cosas a
  // la vez: enseñar el sitio VACÍO y, a renglón seguido, que NO se vea el
  // lugar. Eso no da error: lo resuelve el modelo por su cuenta, que es el
  // fallo que se repite toda esta semana.
  //
  // No se arregla con un aviso, se arregla haciéndolo imposible. **La
  // cláusula del encuadre cerrado existe para esconder a alguien**: donde no
  // hay nadie no tiene nada que esconder, y encima contradice al encuadre.
  if (cerrado && CUERPO.has(encuadre)) {
    partes.push('ENCUADRE CERRADO sobre la acción: la cámara está MUY CERCA y solo entran el gesto, las manos, el equipo y el terreno inmediato.')
    partes.push('NO se ve el lugar: ni el horizonte, ni la silueta de la montaña, ni el edificio, ni nada que permita reconocer dónde es. Fondo desenfocado o fuera de cuadro.')
  }

  // ── EL SEGUNDO EJE: desde dónde se mira y con qué luz ───
  //
  // Sin esto, variábamos QUÉ se ve y dejábamos sin tocar CÓMO se mira: 47
  // fotos de objeto con la misma cámara son 47 fotos iguales aunque el
  // objeto cambie. Solo lo llevan los gooals que lo tienen DECIDIDO.
  const camara = CAMARA[gooal.titulo]

  // ── EL CANDADO DE LA LUZ ────────────────────────────────
  //
  // Antes, un gooal sin cámara decidida se construía IGUAL: sin línea de
  // ángulo y sin línea de luz. No fallaba nada. Y eso es exactamente el
  // fallo que se repite en este repo — una ausencia leída como un estado
  // válido, igual que el descarte de 'espaldas' o un rechazo de OpenAI
  // contado como «sin foto».
  //
  // Lo que decide entonces es el modelo, y elige siempre lo mismo: penumbra.
  // Medido el 10-10-2026 sobre 25 imágenes: las 21 sin cámara salieron
  // oscuras y cinco de ellas eran un rectángulo negro a 179 px; las cuatro
  // que sí tenían luz escrita fueron las cuatro que se leían.
  //
  // Así que no se rellena la lista y ya: se cierra la puerta. Un eje que el
  // encuadre no fija y que nadie ha decidido PARA el guion. El gooal que
  // entre mañana no puede volver a salir en penumbra por olvido.
  const fija = EJE_QUE_FIJA[encuadre]
  for (const [i, eje, nombre] of [[0, 'angulo', 'ángulo'], [1, 'luz', 'luz']]) {
    if (fija === eje) continue           // lo pone el propio encuadre
    if (camara && camara[i]) continue    // está decidido
    throw new Error(
      `SIN ${nombre.toUpperCase()} en «${gooal.titulo}»: el encuadre ${encuadre} no fija ` +
      `${eje === 'angulo' ? 'el ángulo' : 'la luz'}, así que hay que decidirlo en CAMARA ` +
      `(decisiones.mjs). Sin esto el prompt sale sin esa línea y la pone el modelo.`)
  }

  if (camara) {
    // EL CANDADO. No avisa: para. Un encuadre que ya fija un eje no puede
    // recibir otro, porque entonces el prompt se contradice y decide el
    // modelo. Es el mismo candado que el del encuadre cerrado.
    if (fija === 'angulo' && camara[0]) {
      throw new Error(
        `EJES QUE CHOCAN en «${gooal.titulo}»: el encuadre ${encuadre} ya fija el ángulo, ` +
        `y la cámara le pone «${camara[0]}». Deja el ángulo en null para este gooal.`)
    }
    if (fija === 'luz' && camara[1]) {
      throw new Error(
        `EJES QUE CHOCAN en «${gooal.titulo}»: el encuadre ${encuadre} ya fija la luz, ` +
        `y la cámara le pone «${camara[1]}». Deja la luz en null para este gooal.`)
    }
    if (camara[0]) partes.push(ANGULOS[camara[0]] ?? "")
    if (camara[1]) partes.push(LUCES[camara[1]] ?? "")
  }

  // El momento SOLO donde hay cuerpo: varios nombran brazos, manos o un
  // hombro, y en una foto sin nadie eso mete a alguien sin dar ningún error.
  const momento = CUERPO.has(encuadre) ? momentoDe(gooal.titulo) : null
  if (momento) partes.push(momento)

  partes.push(PROHIBIDO)
  partes.push(COMUNES)
  partes.push(estilo.bloque)

  return partes.filter(Boolean).join(' ')
}

/** El encuadre que le toca a un gooal, para poder enseñarlo en la hoja. */
export { momentoDe }

/**
 * El encuadre de un gooal. Dos escalones y nada más:
 *
 *   1. Lo que está escrito a mano para ESE gooal, que es una decisión tomada
 *      mirándolo. Manda siempre.
 *   2. El orden a→f, que propone.
 *
 * Ya no hay un tercer escalón por categoría: era el que mandaba el 78 % del
 * catálogo a 'espaldas' sin que nadie hubiera mirado ni un título.
 */
export const encuadreDe = gooal => {
  const aMano = ENCUADRE_DE[gooal.titulo]
  if (aMano) return aMano
  const { encuadre } = clasificar(gooal)
  if (encuadre) return encuadre
  // NO HAY VALOR POR DEFECTO, y es lo que impide que vuelva lo de antes:
  // 'espaldas' llegó al 41 % porque era la salida de todo lo que no casaba
  // con ninguna regla. Lo que no se ha decidido no pasa — se para y se
  // decide. Es el mismo candado que el de los créditos de las fotos.
  throw new Error(
    `SIN DECIDIR: «${gooal.titulo}» (${gooal.categoria}). No casa ninguna regla ` +
    'y no está escrito en ENCUADRE_DE. Decídelo a mano y escríbelo ahí.')
}

/** Para poder contar y repasar el reparto desde fuera. */
export { ENCUADRES, CUERPO, SOLO_MANOS, ENCUADRE_DE }

/** Por qué regla salió ese encuadre: 'mano' si está escrito, o la letra a→f. */
export const porQueEncuadre = gooal =>
  ENCUADRE_DE[gooal.titulo] ? 'mano' : clasificar(gooal).por

// Una pista corta por categoría: lo que esa categoría suele necesitar para que
// la escena no salga genérica. No describe el gooal — eso lo hace el título.
const CONTEXTO_CATEGORIA = {
  viajes: 'Escena de viaje, con el lugar reconocible por su arquitectura o su paisaje.',
  naturaleza: 'Al aire libre, con la escala del paisaje presente pero una persona dentro que da la medida.',
  eventos: 'Ambiente de acontecimiento, con gente alrededor y sensación de que pasa algo irrepetible.',
  deporte: 'Gesto deportivo en pleno movimiento, con el equipo y el esfuerzo visibles.',
  gastronomia: 'Primer plano del plato o de la comida, con las manos de quien va a comerlo y el sitio donde se come alrededor.',
  vida: 'Un momento cotidiano y personal, íntimo, de alguien consiguiendo algo suyo.',
}
