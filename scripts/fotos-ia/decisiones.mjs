// LAS 96 QUE NO DECIDE NINGUNA REGLA, decididas a mano, una a una.
//
// ── POR QUÉ ESTO NO ES UNA REGLA MÁS ──────────────────────
//
// Las reglas a→f cubren el 62 % del catálogo y ahí se quedan: estirarlas hasta
// cubrirlo todo sería encadenar heurísticas, que en este repo ya está medido y
// pagado — cada una arregla unos casos y rompe otros, y el número automático
// sube mientras el real no.
//
// El otro 38 % no se resuelve con una regla nueva: **una regla vuelve a decidir
// en silencio por gooals que nadie ha mirado; una línea con nombre y apellido
// no.** Así que aquí hay 96 líneas, y cada una se ha mirado.
//
// ── CÓMO SE ELIGIÓ, Y QUÉ NO SE HIZO ──────────────────────
//
// La familia de verbo da la DIRECCIÓN y el gooal concreto da el encuadre:
//
//   bañarte   → el agua, nunca alguien dentro
//   navegar   → la embarcación: la cubierta, el cabo, la estela
//   correr    → el dorsal, las zapatillas, el recorrido vacío
//   subir     → lo que se ve desde arriba, o el camino que sube
//   montar    → el vehículo, sin nadie encima
//   hacer     → no es una familia, es un cajón: una a una
//
// Lo que NO se ha hecho es repetir el mismo encuadre once veces dentro de una
// familia. **Once calas idénticas serían el problema de las espaldas con otra
// ropa**, y el sitio de la variedad es el objeto concreto de cada gooal.
//
// Y 'espaldas' puede quedarse donde esté DECIDIDO —«Correr un 10K» lo está, con
// su escena escrita—; lo que no puede es volver a llegar solo.

/** título → [encuadre, escena]. Escena null = ya tiene una escrita en ESCENAS. */
export const DECIDIDOS = {

  // ══ HACER (22) · el cajón, una a una ════════════════════

  // Las seis ferratas, seis encuadres distintos: es el caso donde más fácil
  // era poner la misma foto seis veces.
  'Hacer una vía ferrata': ['manos',
    'Solo las manos agarrando el cable de acero de una vía ferrata, con el mosquetón de la línea de vida enganchado, y la roca pegada detrás.'],
  'Hacer la ferrata de Baumes Corcades': ['detalle',
    'Primerísimo plano de una grapa de hierro clavada en la roca, con el cable de acero pasando por detrás y el óxido marcado.'],
  'Hacer la ferrata de Boixadera dels Bancs': ['primera_persona',
    'Desde los ojos de quien sube: las puntas de las botas apoyadas en dos grapas de hierro y el vacío abriéndose justo debajo.'],
  'Hacer la ferrata de Centelles': ['objeto',
    'Un arnés con sus dos bagas y el disipador colgando, dejado sobre una roca plana al pie de la vía.'],
  'Hacer la ferrata de Les Baumes': ['silueta_lejana',
    'Un puente de cable tendido sobre un barranco, con una figura diminuta a media travesía y la pared entera alrededor.'],
  'Hacer la ferrata del Salt del Grill': ['lugar_vacio',
    'Una pared de roca con el cable de acero y las grapas tendidas de abajo arriba, mojada por un salto de agua al lado, sin nadie.'],

  'Hacer barranquismo en la Noguera': ['primera_persona',
    'Desde los ojos de quien desciende: una garganta estrecha de roca pulida con el agua cayendo al lado y la cuerda saliendo del encuadre por abajo.'],
  'Hacer rafting': ['primera_persona',
    'Desde dentro de la balsa: la proa hinchable levantándose sobre un rápido y el agua blanca saltando hacia la cámara.'],
  'Hacer rafting por el Noguera Pallaresa': ['detalle',
    'Primerísimo plano del agua blanca rompiendo contra una roca pulida, con la espuma saltando y el sol en las gotas.'],

  'Hacer el Camino de Santiago': ['objeto',
    'Un bordón de madera y una concha de vieira atada a una mochila gastada, apoyados en un muro de piedra al sol de la mañana.'],
  'Hacer el Camino de Santiago desde Montserrat': ['detalle',
    'Primerísimo plano de una flecha amarilla pintada a brocha sobre una piedra gris, descascarillada por la lluvia.'],
  'Hacer el Camí dels Bons Homes': ['lugar_vacio',
    'Un sendero de piedra subiendo entre matorral hacia un collado, con un mojón de piedras apiladas al borde y nadie a la vista.'],
  'Hacer la Matagalls-Montserrat': ['lugar_vacio',
    'Un camino de tierra cruzando un hayedo de noche, iluminado solo por la luna, con la niebla entre los troncos y ninguna persona.'],
  'Hacer la ruta de las nueve ermitas del Montsant': ['lugar_vacio',
    'Una ermita pequeña de piedra seca en una ladera de monte bajo, con la puerta de madera cerrada y nadie alrededor.'],
  'Hacer la Vía Verde del Carrilet de Olot a Girona': ['lugar_vacio',
    'Una vía verde de tierra apisonada entre plataneros, entrando en un túnel antiguo de piedra, completamente vacía.'],
  'Hacer los Carros de Foc': ['objeto',
    'Una mochila pequeña y dos bastones de montaña apoyados en la puerta de madera de un refugio de alta montaña.'],
  'Hacer la Travessia del Port de Barcelona nadando': ['objeto',
    'Una boya naranja de nadador flotando sola en aguas abiertas, con la superficie picada y la luz rasante de la mañana.'],
  'Hacer paddle surf en el cabo de Creus': ['lugar_vacio',
    'Una cala de roca desnuda con el agua lisa como un espejo, sin una sola persona.'],
  'Hacer un safari en el Masái Mara': ['primera_persona',
    'Desde el asiento de un todoterreno abierto: la sabana dorada delante y una manada de elefantes cruzando a media distancia.'],
  'Hacer un safari en el Serengeti': ['silueta_lejana',
    'Una llanura inmensa con una acacia sola y un todoterreno diminuto levantando una línea de polvo a lo lejos.'],
  'Hacer una marcha cicloturista de montaña': ['objeto',
    'Una bicicleta de montaña apoyada en un árbol junto a un camino de tierra, con barro fresco en las ruedas y los piñones.'],
  'Hacer una ruta en moto de varios días': ['objeto',
    'Dos alforjas cerradas y un casco apoyados sobre el asiento de una moto de carretera, parada en el arcén de una curva de montaña.'],

  // ══ BAÑARTE (11) · el agua, nunca alguien dentro ════════

  'Bañarte en Bondi Beach': ['lugar_vacio',
    'Una playa urbana larga, completamente vacía, con la espuma subiendo por la arena mojada y los edificios bajos desenfocados al fondo.'],
  'Bañarte en Cala Estreta': ['primera_persona',
    'Desde el borde de una roca, mirando a plomo el agua turquesa y los guijarros del fondo, justo antes de entrar.'],
  'Bañarte en la cala de Sa Tuna': ['objeto',
    'Dos barcas de madera varadas en una orilla de guijarros, con el agua quieta lamiendo el casco pintado.'],
  'Bañarte en la Laguna Azul': ['detalle',
    'Primerísimo plano de agua lechosa azul con el vapor levantándose de la superficie y un borde de roca volcánica negra.'],
  'Bañarte en la playa de Copacabana': ['lugar_vacio',
    'Un paseo marítimo de mosaico en ondas blancas y negras junto a la arena, vacío, con el mar al lado.'],
  'Bañarte en las terrazas de Pamukkale': ['lugar_vacio',
    'Terrazas blancas de cal escalonadas, con una poza de agua turquesa en cada escalón y ninguna persona.'],
  'Bañarte en los Baños Széchenyi': ['lugar_vacio',
    'Una piscina termal al aire libre con el vapor subiendo del agua y una fachada amarilla alrededor, completamente vacía.'],
  'Bañarte en los gorgs de la Garrotxa': ['detalle',
    'Primerísimo plano del chorro de agua cayendo en una poza redonda de roca oscura, con las burbujas blancas al pie.'],
  'Bañarte en Santa Monica': ['lugar_vacio',
    'Una playa ancha de arena clara con el muelle de madera entrando en el mar al fondo, desenfocado, y ninguna persona.'],
  'Bañarte en South Beach': ['objeto',
    'Una hamaca y una sombrilla de rayas de colores, plantadas en la arena y vacías, con la luz dura del mediodía.'],
  'Bañarte en una playa de arena negra de Santorini': ['detalle',
    'Primerísimo plano de arena negra mojada con la espuma blanca entrando y retirándose, y guijarros oscuros brillando.'],

  // ══ NAVEGAR (10) · la embarcación: cubierta, cabo, estela ══

  'Navegar el Bósforo en barco': ['objeto',
    'Un cabo grueso enrollado en un noray de hierro, en la cubierta de un ferry, con el agua pasando desenfocada al fondo.'],
  'Navegar entre los islotes de El Nido': ['primera_persona',
    'Desde la proa de una barca de madera con balancines, el mar turquesa abriéndose entre paredes de roca que salen del agua.'],
  'Navegar por el Amazonas': ['detalle',
    'Primerísimo plano del agua marrón del río partiéndose en la proa, con la selva verde desenfocada detrás.'],
  'Navegar por el delta del Ebro': ['lugar_vacio',
    'Un embarcadero de madera con una barca amarrada en agua quieta entre carrizo, al atardecer, sin nadie.'],
  'Navegar por el delta del Okavango': ['objeto',
    'Una pértiga larga apoyada en una canoa estrecha de madera, varada entre juncos, con el agua clara debajo.'],
  'Navegar por el río Chao Phraya': ['detalle',
    'La estela espumosa que deja una barca larga de motor, vista desde la popa, con el agua marrón abriéndose en uve.'],
  'Navegar por el río Li en Guilin': ['primera_persona',
    'Desde una balsa de bambú, el río liso delante y los montes en punta saliendo de la niebla a los lados.'],
  'Navegar por la bahía de Ha Long': ['objeto',
    'Una vela de junco color teja, recogida y atada sobre la cubierta de madera de un barco tradicional.'],
  'Navegar por los fiordos noruegos': ['primera_persona',
    'Desde la cubierta de un barco, el agua negra delante y las paredes del fiordo subiendo a los dos lados hasta salirse del encuadre.'],
  'Navegar por Milford Sound': ['detalle',
    'Una cascada estrellándose contra el agua desde una pared vertical, de cerca, con la bruma levantándose.'],

  // ══ CORRER (7) · el dorsal, las zapatillas, el recorrido ══

  'Correr un 10K': ['espaldas', null],   // decidido y con escena escrita desde el 8-10
  'Correr la Cursa dels Bombers': ['lugar_vacio',
    'Una calle ancha de ciudad cortada al tráfico, con las vallas puestas a los lados y el asfalto recién regado, sin nadie todavía.'],
  'Correr la Mitja de Granollers': ['objeto',
    'Un dorsal completamente en blanco, SIN NINGÚN NÚMERO, sujeto con cuatro imperdibles sobre una camiseta técnica doblada.'],
  'Correr la Ultra Pirineu': ['detalle',
    'Primerísimo plano de unas zapatillas de trail embarradas sobre un sendero de piedra mojada.'],
  'Correr un maratón': ['silueta_lejana',
    'Una carretera larga y vacía, con una única figura diminuta corriendo a lo lejos y el asfalto brillando.'],
  'Correr un ultratrail': ['primera_persona',
    'De noche, desde los ojos de quien corre: el haz de un frontal iluminando un palmo de sendero y oscuridad total alrededor.'],
  'Correr una media maratón': ['detalle',
    'Primerísimo plano del asfalto con la línea blanca de la calzada y una flecha de pintura, sin ninguna letra.'],

  // ══ MONTAR (6) · el vehículo, sin nadie encima ══════════

  'Montar en el London Eye': ['primera_persona',
    'Desde dentro de una cápsula de cristal: la ciudad y el río abajo, con el marco curvo del cristal entrando por los bordes.'],
  'Montar en el Star Ferry': ['objeto',
    'Un banco de listones de madera con el respaldo abatible, vacío, en la cubierta de un ferry viejo, con el agua detrás.'],
  'Montar en el tranvía 28 de Lisboa': ['lugar_vacio',
    'El interior vacío de un tranvía de madera, con las barras de latón, las ventanillas subidas y la luz entrando en diagonal.'],
  'Montar en el tranvía de San Francisco': ['detalle',
    'Primerísimo plano del estribo de madera gastada de un tranvía y del cable de tracción metido en la ranura del suelo.'],
  'Montar en skateboard': ['objeto',
    'Un monopatín volcado sobre el hormigón pulido de un bowl, con una rueda todavía girando y las marcas negras alrededor.'],
  'Montar en un coche clásico por La Habana': ['objeto',
    'El salpicadero cromado y el volante grande de un descapotable americano de los cincuenta, con la tapicería agrietada y el sol encima.'],

  // ══ SUBIR (6) · lo que se ve desde arriba, o el camino ══

  'Subir en bici al Angliru': ['primera_persona',
    'Desde los ojos de quien pedalea: el manillar abajo en el encuadre y una rampa de asfalto oscuro subiendo en vertical delante.'],
  'Subir en bici al Alpe d\'Huez': ['lugar_vacio',
    'Las lazadas de una carretera de montaña encadenadas una encima de otra, vistas desde arriba, sin ningún ciclista.'],
  'Subir en bici al Mont Ventoux': ['detalle',
    'Primerísimo plano del asfalto gris y la grava blanca del arcén en una cima pelada, con el viento levantando polvo.'],
  'Subir en bici a la Rabassa': ['objeto',
    'Una bicicleta de carretera apoyada en un mojón de piedra al borde de una carretera de montaña, con niebla detrás.'],
  'Subir en bici al Port del Cantó': ['silueta_lejana',
    'Una carretera estrecha entre pinos subiendo por una ladera, con un ciclista diminuto a media rampa que apenas se distingue.'],
  'Subir un puerto de primera categoría en bici': ['detalle',
    'Primerísimo plano del piñón más grande de una bicicleta con la cadena tensada encima y los radios desenfocados.'],

  // ══ TERMINAR (4) ════════════════════════════════════════

  'Terminar un Ironman': ['objeto',
    'Una medalla pesada colgada del respaldo de una silla por su cinta arrugada, sin ninguna letra ni número grabado.'],
  'Terminar un medio Ironman': ['detalle',
    'Primerísimo plano de un neopreno enrollado y mojado sobre el asfalto caliente, con el agua todavía goteando.'],
  'Terminar un triatlón olímpico': ['lugar_vacio',
    'Una zona de transición vacía, con las bicicletas colgadas de las barras por el sillín y las toallas extendidas en el suelo.'],
  'Terminar una Hyrox': ['objeto',
    'Un trineo cargado de discos parado sobre el suelo de goma de un pabellón, con la cuerda de arrastre tendida delante.'],

  // ══ VOLAR (4) ═══════════════════════════════════════════

  'Volar en globo sobre la Capadocia': ['silueta_lejana',
    'Decenas de globos diminutos flotando a distintas alturas sobre un valle de chimeneas de roca.'],
  'Volar en globo sobre los volcanes de la Garrotxa': ['primera_persona',
    'Desde la cesta, mirando hacia abajo: un mosaico de campos y bosques con niebla metida en los valles.'],
  'Volar en globo sobre Luxor': ['detalle',
    'Primerísimo plano del quemador de un globo soltando una llama corta contra la tela rayada de encima.'],
  'Volar en parapente': ['objeto',
    'Una vela de parapente extendida sobre la hierba de una ladera, con las líneas tendidas y el arnés colocado encima.'],

  // ══ BUCEAR (3) ══════════════════════════════════════════

  'Bucear a más de 30 metros': ['primera_persona',
    'Desde los ojos de quien bucea, mirando hacia arriba: la superficie muy lejos y la luz filtrándose en azul oscuro.'],
  'Bucear en las islas Medes': ['detalle',
    'Primerísimo plano de una gorgonia roja abierta sobre la roca, con peces pequeños desenfocados detrás.'],
  'Bucear en Raja Ampat': ['lugar_vacio',
    'Un arrecife de coral poblado visto a media agua, con el agua turquesa clarísima y ninguna persona.'],

  // ══ LLEGAR (3) ══════════════════════════════════════════

  'Llegar al Cabo de Buena Esperanza': ['lugar_vacio',
    'Un acantilado de roca sobre dos mares que se juntan, con la vegetación baja doblada por el viento y nadie.'],
  'Llegar al Cabo Norte': ['objeto',
    'Una esfera de hierro oxidado sobre un acantilado al borde del mar, bajo un cielo plomizo y sin una sola persona.'],
  'Llegar al campo base del Everest': ['silueta_lejana',
    'Un campamento de tiendas de colores diminuto sobre un glaciar de piedras, con una pared de montaña inmensa detrás.'],

  // ══ RECORRER (3) ════════════════════════════════════════

  'Recorrer el carril bici más largo del mundo': ['lugar_vacio',
    'Un carril bici recto perdiéndose en el horizonte entre campos llanos, completamente vacío.'],
  'Recorrer el Freedom Trail': ['detalle',
    'Primerísimo plano de una línea de ladrillo rojo encajada en una acera de losas grises, girando en una esquina.'],
  'Recorrer un GR entero': ['objeto',
    'Una mochila grande de travesía con las correas gastadas, apoyada en un mojón de piedra con una marca pintada blanca y roja.'],

  // ══ BAJAR (2) ═══════════════════════════════════════════

  'Bajar a la montaña de sal de Cardona': ['detalle',
    'Primerísimo plano de una pared de sal gris veteada de blanco, brillando bajo una luz puntual en la oscuridad.'],
  'Bajar al cráter del volcán Santa Margarida': ['lugar_vacio',
    'El fondo llano y verde de un cráter con una ermita pequeña en medio, visto desde el borde de arriba, sin nadie.'],

  // ══ ESCALAR (2) ═════════════════════════════════════════

  'Escalar en Siurana': ['detalle',
    'Primerísimo plano de una regleta de caliza naranja con restos de magnesio blanco en el canto.'],
  'Escalar una aguja de Montserrat': ['silueta_lejana',
    'Una aguja de conglomerado redondeado saliendo del bosque, con una figura diminuta a media pared que apenas se ve.'],

  // ══ SALTAR (2) ══════════════════════════════════════════

  'Saltar en puenting': ['primera_persona',
    'Desde el borde de una pasarela, mirando a plomo hacia abajo: un río corriendo muy lejos y las puntas de los pies asomando por el borde del encuadre.'],
  'Saltar en puenting en Queenstown': ['objeto',
    'Una cuerda elástica gruesa enrollada sobre el suelo de madera de una pasarela, con un mosquetón grande de acero encima.'],

  // ══ LOS SUELTOS (11) ════════════════════════════════════

  'Beber una cerveza en la Hofbräuhaus': ['objeto',
    'Una jarra de litro de cerveza con dos dedos de espuma sobre una mesa larga de madera, con un posavasos mojado al lado.'],
  'Dar una vuelta al Nürburgring': ['primera_persona',
    'Desde el asiento del conductor: el volante abajo y una carretera de curvas entre bosque abriéndose delante.'],
  'Escuchar jazz en directo en Bourbon Street': ['objeto',
    'Una trompeta apoyada en un taburete junto a un micrófono de pie antiguo, en un local pequeño con luz cálida y nadie.'],
  'Jugar en el Old Course de St Andrews': ['lugar_vacio',
    'Un campo de golf de links con un puente pequeño de piedra sobre un arroyo, la hierba rapada y el mar gris al fondo, vacío.'],
  'Lanzar una moneda en la Fontana di Trevi': ['detalle',
    'Primerísimo plano de monedas en el fondo de una fuente, bajo agua clara y azulada, con la luz temblando encima.'],
  'Pasear en góndola por Venecia': ['objeto',
    'La proa de hierro dentado de una góndola negra amarrada, con el agua verde debajo y una fachada desconchada desenfocada detrás.'],
  'Perderte en los zocos de Marrakech': ['lugar_vacio',
    'Un callejón de zoco cubierto de cañizo, con lámparas de metal colgadas y alfombras apiladas, atravesado por haces de luz y sin nadie.'],
  'Pilotar un kart': ['objeto',
    'Un kart parado en el pit lane con el volante pequeño y un casco apoyado en el asiento, con los neumáticos marcados.'],
  'Pisar la Antártida': ['lugar_vacio',
    'Una playa de piedras negras con trozos de hielo varados y un glaciar azul al fondo, sin ninguna persona.'],
  'Salir por el Temple Bar': ['lugar_vacio',
    'Una calle estrecha de fachadas rojas con farolas encendidas y adoquines mojados, de madrugada y vacía.'],
  'Tomar un café en el Café Central': ['objeto',
    'Una taza de café con su cucharilla y un vaso de agua sobre un velador de mármol, con una silla de madera curvada al lado.'],
}

/**
 * EL SEGUNDO EJE: desde dónde se mira y con qué luz.
 *
 * Se añadió al repasar las escenas de objeto seguidas: dos bicis apoyadas, dos
 * mochilas en un mojón, dos cascos sobre un asiento... Variábamos QUÉ se ve y
 * dejábamos sin tocar CÓMO se mira, y **47 fotos con la misma cámara son 47
 * fotos iguales aunque el objeto cambie.**
 *
 * Elegido mirando el gooal, igual que el encuadre: ni por turno ni al azar. Y
 * contado, que el eje que nadie cuenta es el que se degrada: dentro de una
 * misma familia de encuadre, ningún par ángulo+luz se repite más de tres
 * veces, y el guion del reparto lo comprueba.
 */
export const CAMARA = {
  "Hacer una vía ferrata": ["desde muy cerca", "mediodía duro"],
  "Hacer la ferrata de Baumes Corcades": ["desde muy cerca", "tarde larga"],
  "Hacer la ferrata de Boixadera dels Bancs": ["cenital", "mediodía duro"],
  "Hacer la ferrata de Centelles": ["a ras de suelo", "día nublado"],
  "Hacer la ferrata de Les Baumes": ["a la altura de los ojos", "tarde larga"],
  "Hacer la ferrata del Salt del Grill": ["contrapicado", "día nublado"],
  "Hacer barranquismo en la Noguera": ["cenital", "interior"],
  "Hacer rafting": ["a ras de suelo", "mediodía duro"],
  "Hacer rafting por el Noguera Pallaresa": ["desde muy cerca", "mediodía duro"],
  "Hacer el Camino de Santiago": ["a la altura de los ojos", "amanecer"],
  "Hacer el Camino de Santiago desde Montserrat": ["a ras de suelo", "día nublado"],
  "Hacer el Camí dels Bons Homes": ["a la altura de los ojos", "tarde larga"],
  "Hacer la Matagalls-Montserrat": ["a ras de suelo", "noche"],
  "Hacer la ruta de las nueve ermitas del Montsant": ["a la altura de los ojos", "mediodía duro"],
  "Hacer la Vía Verde del Carrilet de Olot a Girona": ["a ras de suelo", "día nublado"],
  "Hacer los Carros de Foc": ["a la altura de los ojos", "amanecer"],
  "Hacer la Travessia del Port de Barcelona nadando": ["a ras de suelo", "amanecer"],
  "Hacer paddle surf en el cabo de Creus": ["a la altura de los ojos", "amanecer"],
  "Hacer un safari en el Masái Mara": ["a la altura de los ojos", "tarde larga"],
  "Hacer un safari en el Serengeti": ["contrapicado", "mediodía duro"],
  "Hacer una marcha cicloturista de montaña": ["a ras de suelo", "tarde larga"],
  "Hacer una ruta en moto de varios días": ["a la altura de los ojos", "tarde larga"],
  "Bañarte en Bondi Beach": ["a ras de suelo", "amanecer"],
  "Bañarte en Cala Estreta": ["cenital", "mediodía duro"],
  "Bañarte en la cala de Sa Tuna": ["a la altura de los ojos", "tarde larga"],
  "Bañarte en la Laguna Azul": ["desde muy cerca", "día nublado"],
  "Bañarte en la playa de Copacabana": ["a la altura de los ojos", "amanecer"],
  "Bañarte en las terrazas de Pamukkale": ["contrapicado", "tarde larga"],
  "Bañarte en los Baños Széchenyi": ["cenital", "día nublado"],
  "Bañarte en los gorgs de la Garrotxa": ["desde muy cerca", "interior"],
  "Bañarte en Santa Monica": ["a ras de suelo", "tarde larga"],
  "Bañarte en South Beach": ["a la altura de los ojos", "mediodía duro"],
  "Bañarte en una playa de arena negra de Santorini": ["cenital", "mediodía duro"],
  "Navegar el Bósforo en barco": ["cenital", "día nublado"],
  "Navegar entre los islotes de El Nido": ["a la altura de los ojos", "mediodía duro"],
  "Navegar por el Amazonas": ["desde muy cerca", "día nublado"],
  "Navegar por el delta del Ebro": ["a ras de suelo", "tarde larga"],
  "Navegar por el delta del Okavango": ["a ras de suelo", "amanecer"],
  "Navegar por el río Chao Phraya": ["cenital", "tarde larga"],
  "Navegar por el río Li en Guilin": ["a la altura de los ojos", "amanecer"],
  "Navegar por la bahía de Ha Long": ["desde muy cerca", "tarde larga"],
  "Navegar por los fiordos noruegos": ["a la altura de los ojos", "día nublado"],
  "Navegar por Milford Sound": ["contrapicado", "día nublado"],
  "Correr un 10K": ["a la altura de los ojos", "amanecer"],
  "Correr la Cursa dels Bombers": ["a ras de suelo", "amanecer"],
  "Correr la Mitja de Granollers": ["cenital", "interior"],
  "Correr la Ultra Pirineu": ["cenital", "día nublado"],
  "Correr un maratón": ["a ras de suelo", "amanecer"],
  "Correr un ultratrail": ["a la altura de los ojos", "noche"],
  "Correr una media maratón": ["cenital", "mediodía duro"],
  "Montar en el London Eye": ["a la altura de los ojos", "tarde larga"],
  "Montar en el Star Ferry": ["a la altura de los ojos", "día nublado"],
  "Montar en el tranvía 28 de Lisboa": ["a la altura de los ojos", "interior"],
  "Montar en el tranvía de San Francisco": ["a ras de suelo", "mediodía duro"],
  "Montar en skateboard": ["cenital", "tarde larga"],
  "Montar en un coche clásico por La Habana": ["desde muy cerca", "mediodía duro"],
  "Subir en bici al Angliru": ["a ras de suelo", "día nublado"],
  "Subir en bici al Alpe d'Huez": ["cenital", "tarde larga"],
  "Subir en bici al Mont Ventoux": ["desde muy cerca", "mediodía duro"],
  "Subir en bici a la Rabassa": ["a la altura de los ojos", "día nublado"],
  "Subir en bici al Port del Cantó": ["contrapicado", "amanecer"],
  "Subir un puerto de primera categoría en bici": ["desde muy cerca", "tarde larga"],
  "Terminar un Ironman": ["a la altura de los ojos", "interior"],
  "Terminar un medio Ironman": ["cenital", "mediodía duro"],
  "Terminar un triatlón olímpico": ["a la altura de los ojos", "amanecer"],
  "Terminar una Hyrox": ["a ras de suelo", "interior"],
  "Volar en globo sobre la Capadocia": ["a la altura de los ojos", "amanecer"],
  "Volar en globo sobre los volcanes de la Garrotxa": ["cenital", "amanecer"],
  "Volar en globo sobre Luxor": ["contrapicado", "noche"],
  "Volar en parapente": ["cenital", "tarde larga"],
  "Bucear a más de 30 metros": ["contrapicado", "interior"],
  "Bucear en las islas Medes": ["desde muy cerca", "interior"],
  "Bucear en Raja Ampat": ["a la altura de los ojos", "mediodía duro"],
  "Llegar al Cabo de Buena Esperanza": ["a la altura de los ojos", "día nublado"],
  "Llegar al Cabo Norte": ["contrapicado", "día nublado"],
  "Llegar al campo base del Everest": ["a la altura de los ojos", "mediodía duro"],
  "Recorrer el carril bici más largo del mundo": ["a ras de suelo", "mediodía duro"],
  "Recorrer el Freedom Trail": ["cenital", "día nublado"],
  "Recorrer un GR entero": ["a la altura de los ojos", "amanecer"],
  "Bajar a la montaña de sal de Cardona": ["desde muy cerca", "interior"],
  "Bajar al cráter del volcán Santa Margarida": ["contrapicado", "tarde larga"],
  "Escalar en Siurana": ["desde muy cerca", "tarde larga"],
  "Escalar una aguja de Montserrat": ["contrapicado", "amanecer"],
  "Saltar en puenting": ["cenital", "mediodía duro"],
  "Saltar en puenting en Queenstown": ["a ras de suelo", "día nublado"],
  "Beber una cerveza en la Hofbräuhaus": ["a la altura de los ojos", "interior"],
  "Dar una vuelta al Nürburgring": ["a la altura de los ojos", "día nublado"],
  "Escuchar jazz en directo en Bourbon Street": ["a la altura de los ojos", "noche"],
  "Jugar en el Old Course de St Andrews": ["a ras de suelo", "día nublado"],
  "Lanzar una moneda en la Fontana di Trevi": ["cenital", "interior"],
  "Pasear en góndola por Venecia": ["desde muy cerca", "tarde larga"],
  "Perderte en los zocos de Marrakech": ["a la altura de los ojos", "interior"],
  "Pilotar un kart": ["a ras de suelo", "mediodía duro"],
  "Pisar la Antártida": ["a la altura de los ojos", "día nublado"],
  "Salir por el Temple Bar": ["a la altura de los ojos", "noche"],
  "Tomar un café en el Café Central": ["cenital", "interior"],
  "Practicar CrossFit": ["a ras de suelo", "interior"],
  "Practicar golf": ["desde muy cerca", "amanecer"],
  "Practicar pádel": ["a ras de suelo", "tarde larga"],
  "Practicar tenis": ["cenital", "tarde larga"],
  "Practicar hípica": ["a la altura de los ojos", "día nublado"],
  "Practicar surf": ["contrapicado", "tarde larga"],
  "Practicar windsurf": ["a la altura de los ojos", "mediodía duro"],
  "Practicar kitesurf": ["contrapicado", "tarde larga"],
  "Practicar wakeboard": ["cenital", "mediodía duro"],
  "Practicar paddle surf": ["cenital", "amanecer"],
  "Practicar snowboard": ["contrapicado", "mediodía duro"],
  "Practicar esquí de travesía": ["contrapicado", "amanecer"],
  "Practicar escalada en roca": ["a ras de suelo", "tarde larga"],
  "Practicar escalada en hielo": ["desde muy cerca", "día nublado"],
  "Practicar motocross": ["cenital", "día nublado"],
  "Practicar patinaje sobre hielo": ["cenital", "interior"],
  "Practicar escalada en rocódromo": ["a la altura de los ojos", "interior"],
  "Practicar esquí": ["a la altura de los ojos", "mediodía duro"],
  "Practicar vela": ["a la altura de los ojos", "día nublado"],
}
