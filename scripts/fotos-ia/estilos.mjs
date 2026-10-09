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
// Así que ya no se prohíbe una cara: se PIDE un encuadre concreto, de estos
// cuatro y ninguno más. Cada gooal lleva el suyo escrito.
const ENCUADRES = {
  espaldas: 'La persona está DE ESPALDAS a la cámara, se le ve la nuca y los hombros, nunca la cara.',
  hombros: 'El encuadre está RECORTADO POR LOS HOMBROS: se ven las manos, los brazos y el torso, y la cabeza queda fuera del encuadre por arriba.',
  // Comer necesita boca, y «la cabeza fuera del encuadre» lo hacía imposible.
  // Una regla que choca con el sujeto no da error: se incumple en silencio, y
  // el modelo resolvió el choque enseñando la cara entera. Así que a la comida
  // se le da un encuadre que SÍ puede cumplir: el plato y las manos, visto
  // desde arriba, sin persona.
  plato: 'Encuadre cenital sobre la mesa: se ven el plato y las manos de quien va a comer, y NADIE MÁS — ni cabeza, ni cara, ni torso, ni boca. La cámara mira hacia abajo.',
  contraluz: 'La persona está A CONTRALUZ y sale como una SILUETA oscura y limpia contra la luz: no se le distingue ni un rasgo de la cara.',
  casco: 'La persona lleva CASCO Y GAFAS que le tapan la cara por completo, y además está en pleno movimiento.',
}

// El encuadre de cada gooal. Lo elijo yo mirando qué tiene sentido en esa
// escena: a un esquiador se le pone casco porque lo lleva de verdad, y a quien
// come se le recorta por los hombros porque lo que importa son las manos y el
// plato.
const ENCUADRE_DE = {
  'Montar tu propia empresa': 'hombros',
  'Practicar esquí': 'casco',
  'Probar el fugu': 'hombros',
  'Cantar en un karaoke': 'contraluz',
  'Saltar en paracaídas': 'casco',
  'Caminar sobre un glaciar en Islandia': 'espaldas',
  'Dormir en una cabaña sin electricidad': 'espaldas',
  'Correr la Marató de Barcelona': 'espaldas',
  // Las escenas de objeto: lo que se ve son unas manos sosteniendo algo, así
  // que la cabeza va fuera del encuadre.
  'Doctorarte': 'hombros',
  'Probar el pulpo vivo': 'plato',
  'Hacer un voluntariado en el extranjero': 'hombros',
  'Terminar una carrera universitaria': 'hombros',
  'Sacarte el título de buceo Open Water': 'contraluz',
  // Una cata no es un plato: con el encuadre cenital de gastronomía salió una
  // cena de pub, con salchichas y puré al lado de las copas. El encuadre por
  // defecto de una categoría no vale cuando el gooal no es lo típico de esa
  // categoría.
  'Hacer una cata de whisky en una destilería': 'hombros',
  // Mirar un eclipse pide cara y gafas: con 'hombros' pasaba lo mismo que con
  // comer. De espaldas, mirando al cielo, sí se puede cumplir.
  'Ver un eclipse solar total': 'espaldas',
  'Sacarte el C1 de inglés': 'hombros',
  'Publicar un libro': 'hombros',
  'Terminar un máster': 'espaldas',
  'Vivir un año en otro país': 'espaldas',
  'Sacarte el cinturón negro': 'espaldas',
}

// Y para los 500 y pico que no tienen el suyo escrito, el que mejor le va a su
// categoría. Es un valor por defecto, no una regla: el mapa de arriba manda.
const ENCUADRE_POR_CATEGORIA = {
  deporte: 'espaldas',
  gastronomia: 'plato',
  naturaleza: 'espaldas',
  viajes: 'espaldas',
  eventos: 'contraluz',
  vida: 'hombros',
}

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
  'Montar tu propia empresa':
    'Dos manos abriendo la persiana metálica de un local pequeño a primera hora, con cajas de cartón aún sin abrir dentro.',
  'Sacarte el C1 de inglés':
    'Unas manos dejando el bolígrafo sobre un examen terminado, en un pupitre de aula vacía junto a una ventana.',
  'Publicar un libro':
    'Unas manos sosteniendo un libro recién impreso, cerrado y sin nada escrito en la cubierta, sobre una mesa de madera.',
  'Terminar un máster':
    'Alguien de espaldas bajando la escalinata de piedra de una facultad con una carpeta bajo el brazo.',
  'Vivir un año en otro país':
    'Alguien de espaldas en el balcón de un piso extranjero al atardecer, con una maleta todavía abierta detrás.',
  'Sacarte el cinturón negro':
    'Unas manos atándose un cinturón negro sobre un kimono blanco, en un tatami vacío.',
  // La escena vieja decía «delante de una pizarra llena de fórmulas» y salió
  // con las fórmulas escritas y legibles. No se coló el texto: lo pedía la
  // escena. Cuando la escena obvia NECESITA texto, no se endurece la
  // prohibición — se cambia de escena.
  'Doctorarte':
    'Un birrete apoyado sobre unas manos, junto a un diploma enrollado y atado con una cinta. El diploma está enrollado y no se ve nada escrito en ninguna parte.',
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

  // Quién sale, por turno. El índice es la posición del gooal en la lista que
  // se está generando, ordenada por título: así el reparto es el mismo cada vez
  // que se lance y no depende de la suerte del modelo.
  const persona = PERSONAS[indice % PERSONAS.length]
  partes.push('Quien aparece en la foto es ' + persona +
    (gooal.categoria === 'deporte' ? '.' : ', ' + CUERPO_CORRIENTE))

  const encuadre = ENCUADRE_DE[gooal.titulo] ?? ENCUADRE_POR_CATEGORIA[gooal.categoria] ?? 'espaldas'

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
    partes.push(encuadre === 'plato'
      ? 'EL SUJETO ES LA COMIDA en sí, en el plato, tal como se sirve.'
      : 'EL SUJETO ES LA ACCIÓN, no el lugar ni el objeto: se tiene que ver a alguien haciéndolo.')
    // El lugar se nombra SOLO si no vamos a cerrar el encuadre. Pedir las dos
    // cosas —«que se note el entorno» y «que no se vea el lugar»— es el mismo
    // choque de instrucciones que ya enseñó caras comiendo: no da error, se
    // incumple en silencio y decide el modelo.
    if (!cerrado && gooal.ambito === 'lugar' && (gooal.ciudad || gooal.pais)) {
      const donde = [gooal.ciudad, gooal.pais].filter(Boolean).join(', ')
      partes.push(`Ocurre en ${donde}, y eso se nota en el entorno, pero el entorno es contexto y no el tema.`)
    }
    partes.push(encuadre === 'plato' ? '' : (CONTEXTO_CATEGORIA[gooal.categoria] ?? ''))
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

  if (cerrado) {
    partes.push('ENCUADRE CERRADO sobre la acción: la cámara está MUY CERCA y solo entran el gesto, las manos, el equipo y el terreno inmediato.')
    partes.push('NO se ve el lugar: ni el horizonte, ni la silueta de la montaña, ni el edificio, ni nada que permita reconocer dónde es. Fondo desenfocado o fuera de cuadro.')
  }

  const momento = momentoDe(gooal.titulo)
  if (momento) partes.push(momento)

  partes.push(PROHIBIDO)
  partes.push(COMUNES)
  partes.push(estilo.bloque)

  return partes.filter(Boolean).join(' ')
}

/** El encuadre que le toca a un gooal, para poder enseñarlo en la hoja. */
export { momentoDe }

export const encuadreDe = gooal =>
  ENCUADRE_DE[gooal.titulo] ?? ENCUADRE_POR_CATEGORIA[gooal.categoria] ?? 'espaldas'

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
