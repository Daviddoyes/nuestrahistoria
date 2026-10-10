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
  'Hacer la ferrata de Les Baumes': ['lugar_vacio',
    'Un puente de cable tendido sobre un barranco, visto de lado y vacío, con las dos paredes de roca a los extremos.'],
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
  "Hacer la ruta de las nueve ermitas del Montsant": ['lugar_vacio',
    "El arco de piedra labrada de la puerta de una ermita diminuta encajada en la roca, llenando el encuadre, y por el hueco del arco el valle abierto al fondo."],
  "Hacer la Vía Verde del Carrilet de Olot a Girona": ['lugar_vacio',
    "La boca de un túnel de vía de tren reconvertido, con el arco de piedra labrada y el firme de tierra compacta saliendo de él, entre taludes de vegetación y sin nadie."],
  'Hacer los Carros de Foc': ['objeto',
    'Una mochila pequeña y dos bastones de montaña apoyados en la puerta de madera de un refugio de alta montaña.'],
  'Hacer la Travessia del Port de Barcelona nadando': ['primera_persona',
    'Desde dentro del agua y a ras de superficie, mirando hacia delante: una hilera de boyas naranjas perdiéndose hacia el fondo del puerto y NINGUNA ORILLA cerca. Lo que cuenta la foto es la distancia que queda, no la brazada.'],
  "Hacer paddle surf en el cabo de Creus": ["objeto",
    "Una tabla de paddle surf blanca y su remo, varadas sobre una losa de roca al borde del agua y ocupando casi todo el encuadre, con una cala de roca retorcida detrás."],
  'Hacer un safari en el Masái Mara': ['primera_persona',
    'Desde el asiento de un todoterreno abierto: la sabana dorada delante y una manada de elefantes cruzando a media distancia.'],
  'Hacer un safari en el Serengeti': ['detalle',
    'Primerísimo plano del lomo rayado de una cebra llenando el encuadre entero, con las rayas nítidas.'],
  'Hacer una marcha cicloturista de montaña': ['objeto',
    'Una bicicleta de montaña apoyada en un árbol junto a un camino de tierra, con barro fresco en las ruedas y los piñones.'],
  'Hacer una ruta en moto de varios días': ['objeto',
    'Dos alforjas cerradas y un casco apoyados sobre el asiento de una moto de carretera, parada en el arcén de una curva de montaña.'],

  // ══ BAÑARTE (11) · el agua, nunca alguien dentro ════════

  'Bañarte en Bondi Beach': ['lugar_vacio',
    "Una hilera de tablas de surf clavadas de pie en la arena mojada, con la espuma llegando hasta ellas y la playa vacía detrás."],
  "Bañarte en Cala Estreta": ['primera_persona',
    "Desde el borde de una plataforma de roca caliza que ocupa todo el primer término, el agua turquesa justo debajo, tan transparente que se ven los guijarros redondos del fondo y la sombra de la roca dentro del agua."],
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
  "Navegar por el delta del Ebro": ['lugar_vacio',
    "Una barca de fondo plano amarrada al borde de un canal entre arrozales inundados que llegan hasta el horizonte, con el agua quieta reflejando el cielo y ni una casa a la vista."],
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

  "Correr un 10K": ['espaldas',
    "Un corredor de espaldas por un paseo marítimo de baldosa al amanecer, con la barandilla y el mar a un lado y el paseo completamente vacío por delante."],   // decidido y con escena escrita desde el 8-10
  'Correr la Cursa dels Bombers': ['espaldas',
    'Una masa compacta de corredores vista desde arriba, llenando la calzada de lado a lado entre los edificios, todos de espaldas y sin un solo dorsal con número.'],
  "Correr la Mitja de Granollers": ['espaldas',
    "Un corredor de espaldas por una calle estrecha de pueblo entre casas bajas de dos plantas, con vecinos mirando desde las aceras y los balcones justo encima."],
  'Correr la Ultra Pirineu': ['contraluz',
    'La silueta de un corredor con bastones avanzando por una cresta pelada de montaña, recortada contra el cielo del atardecer.'],
  "Correr un maratón": ["primera_persona",
    "Desde dentro del grupo, las espaldas y los hombros de los corredores de delante llenando todo el encuadre y repitiéndose hasta el fondo de una avenida ancha."],
  'Correr un ultratrail': ['espaldas',
    'Un corredor de espaldas con mochila ligera subiendo un sendero de montaña entre niebla, visto desde detrás.'],
  'Correr una media maratón': ['hombros',
    'Encuadre recortado por los hombros: el torso y los brazos de alguien en plena zancada, con un reloj deportivo de correa ancha bien visible en la muñeca.'],

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
  "Subir en bici al Port del Cantó": ['lugar_vacio',
    "Una hilera de postes de nieve amarillos y negros clavados al borde de una carretera de montaña estrecha, perdiéndose en la subida, y detrás, desenfocadas, las laderas de pino."],
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

  'Volar en globo sobre la Capadocia': ['objeto',
    'La tela de rayas de colores de un globo inflándose, llenando el encuadre entero, con los colores encendidos por dentro.'],
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
  "Llegar al campo base del Everest": ['lugar_vacio',
    "Banderas de oración de colores tendidas entre dos piedras y agitándose en primer término, y detrás, desenfocado, un campamento de tiendas amarillas sobre un glaciar de piedras."],

  // ══ RECORRER (3) ════════════════════════════════════════

  'Recorrer el carril bici más largo del mundo': ['lugar_vacio',
    'Un carril bici recto perdiéndose en el horizonte entre campos llanos, completamente vacío.'],
  'Recorrer el Freedom Trail': ['detalle',
    'Primerísimo plano de una línea de ladrillo rojo encajada en una acera de losas grises, girando en una esquina.'],
  'Recorrer un GR entero': ['objeto',
    'Una mochila grande de travesía con las correas gastadas, apoyada en un mojón de piedra con una marca pintada blanca y roja.'],

  // ══ BAJAR (2) ═══════════════════════════════════════════

  'Bajar a la montaña de sal de Cardona': ['lugar_vacio',
    'Una galería de sal excavada, con las paredes veteadas de gris y blanco iluminadas de lado y el túnel perdiéndose al fondo, sin nadie.'],
  'Bajar al cráter del volcán Santa Margarida': ['lugar_vacio',
    'El fondo llano y verde de un cráter con una ermita pequeña en medio, visto desde el borde de arriba, sin nadie.'],

  // ══ ESCALAR (2) ═════════════════════════════════════════

  'Escalar en Siurana': ['detalle',
    'Primerísimo plano de una cinta exprés colgando de un anclaje en la caliza naranja, con la chapa metálica recortada contra la roca.'],
  'Escalar una aguja de Montserrat': ['contraluz',
    'La silueta de alguien escalando una aguja de roca redondeada, recortada contra el cielo encendido.'],

  // ══ SALTAR (2) ══════════════════════════════════════════

  'Saltar en puenting': ['detalle',
    'Primerísimo plano de unos tobillos envueltos en una cinta de arnés, con la CUERDA ELÁSTICA gruesa saliendo de ellos y bajando hacia el vacío, y el fondo del barranco desenfocado muy abajo.'],
  'Saltar en puenting en Queenstown': ['lugar_vacio',
    'Una pasarela estrecha de madera y acero saliendo en voladizo sobre un cañón, vacía, con la plataforma de salto al final y un río turquesa muy abajo.'],

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
  // ══ LOS QUE VENÍAN DE LA REGLA e) ══════════════════════
  // Su regla se retiró con silueta_lejana, así que ahora están decididos.
  "Hacer cumbre en el Kilimanjaro": ["lugar_vacio",
    "Un cráter llano y nevado en lo alto de una montaña, con el hielo acanalado en crestas y ni una huella."],
  "Hacer cumbre en un cuatromil": ["primera_persona",
    "Desde la cima, mirando hacia abajo: un mar de nubes blanco con las puntas de otros picos asomando por encima."],
  "Hacer cumbre en un dosmil": ["objeto",
    "Un buzón de cima de metal oxidado atornillado a un montón de piedras, con el valle completamente desenfocado detrás."],
  "Hacer cumbre en un tresmil": ["detalle",
    "Primerísimo plano de la nieve helada en escamas de una arista, con la roca oscura asomando entre las placas."],
  "Hacer un safari por el desierto de Dubái": ["objeto",
    "Un todoterreno parado de perfil en lo alto de una duna, con las huellas de las ruedas bajando por la arena."],
  "Hacer una travesía de varios días en montaña": ["lugar_vacio",
    "Un saco de dormir azul vivo y una esterilla extendidos sobre la hierba, grandes y en primer plano, con la escarcha del amanecer brillando alrededor, y detrás, desenfocadas y claras, las cumbres."],
  "Nadar en aguas abiertas una travesía": ['lugar_vacio',
    'Una hilera de boyas naranjas perdiéndose en línea hacia el horizonte en mar abierto, SIN NINGUNA ORILLA a la vista, con la superficie picada.'],
  // ══ LAS QUE VIVÍAN EN estilos.mjs ══════════════════════
  //
  // Estaban en un ENCUADRE_DE propio de aquel fichero, y eso era una segunda
  // fuente de verdad: un título en los dos sitios y ganaba el de allí, en
  // silencio. Pasó con «Practicar pádel», y encima «Practicar esquí» estaba
  // DOS VECES dentro del mismo objeto (primera_persona y casco, ganaba el
  // último). Ahora el encuadre de un gooal se escribe aquí y en ningún otro
  // sitio; sus escenas siguen en ESCENAS, que es texto del prompt.
  //
  // Las que van con null ya tienen su escena escrita en ESCENAS.
  "Montar tu propia empresa": ["hombros", null],
  "Probar el fugu": ['plato',
    'Un plato redondo con láminas finísimas de pescado crudo dispuestas en flor, casi transparentes sobre la porcelana.'],
  "Cantar en un karaoke": ["contraluz", null],
  "Saltar en paracaídas": ["casco", null],
  "Caminar sobre un glaciar en Islandia": ["espaldas", null],
  "Dormir en una cabaña sin electricidad": ["lugar_vacio",
    "Una vela encendida sobre una mesa de madera basta dentro de una cabaña, con la llama iluminando los troncos de la pared y el resto en penumbra, y una cama deshecha al fondo."],
  "Correr la Marató de Barcelona": ["espaldas",
    "Un corredor de espaldas por el centro de una avenida ancha de ciudad cortada al tráfico, con vallas metálicas y público a los dos lados y la calzada vacía perdiéndose recta hacia el fondo."],
  "Bañarte en la piscina del Marina Bay Sands": ["espaldas", null],
  "Flotar en el mar Muerto": ["espaldas", null],
  "Pasar un día en Ferrari Land": ["objeto",
    "El rizo completo de una montaña rusa roja recortado contra el cielo, visto desde justo debajo, con la estructura de vigas sosteniéndolo."],
  "Doctorarte": ["objeto", null],
  "Probar el pulpo vivo": ["plato", null],
  "Hacer un voluntariado en el extranjero": ['manos',
    'Solo las manos de dos personas pasándose una caja de cartón abierta con ayuda dentro, de cerca.'],
  "Terminar una carrera universitaria": ["objeto",
    "Un birrete negro con la borla girando, lanzado al aire y congelado contra un cielo limpio, ocupando el centro del encuadre."],
  "Sacarte el título de buceo Open Water": ["contraluz", null],
  "Hacer una cata de whisky en una destilería": ['hombros',
    'Encuadre recortado por los hombros: el torso y una mano sosteniendo una copa de cata estrecha con dos dedos de whisky, a contraluz, con barricas de roble apiladas detrás.'],
  "Ver un eclipse solar total": ["espaldas", null],
  "Sacarte el C1 de inglés": ["objeto", null],
  "Publicar un libro": ["objeto", null],
  "Terminar un máster": ["espaldas", null],
  "Vivir un año en otro país": ["espaldas", null],
  "Sacarte el cinturón negro": ["manos", null],
  "Practicar CrossFit": ["objeto", null],
  "Practicar golf": ["objeto", null],
  "Practicar pádel": ["hombros", null],
  "Practicar tenis": ["objeto", null],
  "Practicar hípica": ["objeto", null],
  "Practicar surf": ["objeto", null],
  "Practicar windsurf": ["objeto", null],
  "Practicar kitesurf": ["objeto", null],
  "Practicar wakeboard": ["objeto", null],
  "Practicar paddle surf": ["objeto", null],
  "Practicar snowboard": ["objeto", null],
  "Practicar esquí de travesía": ["objeto", null],
  "Practicar escalada en roca": ["objeto", null],
  "Practicar escalada en hielo": ["detalle", null],
  "Practicar motocross": ["detalle", null],
  "Practicar patinaje sobre hielo": ["detalle", null],
  "Practicar escalada en rocódromo": ["lugar_vacio", null],
  "Practicar esquí": ["primera_persona", null],
  "Practicar vela": ["primera_persona",
    "Desde la cubierta de un velero escorado, la vela mayor blanca tensa llenando media foto por un lado y, por debajo de la baranda inclinada, el mar azul oscuro pasando rápido con espuma."],
  "Actuar en un escenario": ['hombros',
    'Encuadre recortado por los hombros: el torso de alguien frente a un micrófono de pie en un escenario, con los focos encendidos detrás y el cuerpo recortándose en ellos.'],
  "Conducir un coche de carreras en circuito": ['hombros',
    'Encuadre recortado por los hombros: el torso con el arnés de seis puntos cruzado y las dos manos sobre un volante de competición desmontable.'],
  "Mudarte a otro continente": ["espaldas",
    "Alguien de espaldas empujando un carro cargado con dos maletas grandes por un pasillo largo de aeropuerto, visto desde detrás y con el pasillo perdiéndose al fondo."],
  "Bailar salsa": ['contraluz',
    'Dos siluetas enlazadas en pleno giro de baile, recortadas contra las luces cálidas de una sala, sin que se distinga ni un rasgo.'],
  "Bailar tango": ['detalle',
    'Primerísimo plano de cuatro pies en zapatos de tango sobre un suelo de madera, cruzados en el paso, recortados contra el suelo brillante.'],
  "Pilotar una avioneta": ['primera_persona',
    'Desde el asiento del piloto de una avioneta: el morro y la hélice girando delante, y un paisaje de campos muy abajo. No se ve ningún panel con números.'],
  "Donar médula": ["hombros",
    "Encuadre recortado por los hombros: el brazo extendido de alguien tumbado, con un tubo transparente saliendo del antebrazo y una bolsa de donación colgando a un lado."],
  "Hacerte un tatuaje": ["hombros",
    "Encuadre recortado por los hombros: un antebrazo con un tatuaje a medio hacer y una máquina de tatuar en una mano con guante negro, apoyada sobre la piel."],
  "Tocar un instrumento delante de público": ["hombros",
    "Encuadre recortado por los hombros: el torso y las dos manos sobre las cuerdas de una guitarra, con las luces del público desenfocadas al fondo."],
  "Dar una charla ante más de cien personas": ["contraluz",
    "La silueta de alguien de pie en un escenario contra una pantalla grande iluminada, con las cabezas del público en sombra en primer término."],
  // ── Los grupos grandes, con su asunto propio ───────────
  //
  // Compartían elemento, y lo compartido NO puede ser el asunto de ninguno:
  // ocho circuitos vistos desde la grada son ocho fotos de una grada. Cada
  // uno pasa a contarse por lo único que tiene y los otros no, descrito por
  // lo que ES y nunca por su nombre — un quitamiedos con yates detrás, una
  // franja de ladrillo, una subida ciega.
  "Ver un Gran Premio de MotoGP": [null,
    "Desde la grada, una moto de carreras tumbada hasta rozar el asfalto con la rodillera, saliendo del vértice de una curva, con otras dos motos justo detrás."],
  "Ver un Gran Premio en Montmeló": [null,
    "Desde la grada, coches de carreras entrando en fila en una curva lenta de 180 grados, con anchas trampas de grava marrón a los lados y montañas secas y peladas al fondo."],
  "Ver una carrera en el circuito de Mónaco": [null,
    "Desde la grada, un coche de carreras pasando pegado a un quitamiedos metálico al borde del agua, con yates blancos amarrados justo detrás."],
  "Ver una carrera en Indianápolis": [null,
    "Desde la grada, coches de carreras cruzando en fila una franja estrecha de ladrillo rojo encajada en el asfalto de la meta de un óvalo."],
  "Ver una carrera en Monza": [null,
    "Desde la grada, una curva de hormigón muy peraltada y abandonada entre árboles, con los coches de carreras pasando a toda velocidad por la pista nueva justo por debajo."],
  "Ver una carrera en Silverstone": [null,
    "Desde la grada, coches de carreras en una pista completamente llana entre hierba, con el muro de boxes a un lado y hangares bajos y redondeados de antiguo aeródromo al fondo."],
  "Ver una carrera en Spa-Francorchamps": [null,
    "Desde la grada, una subida ciega y muy empinada que se pierde cuesta arriba entre bosque, con los guardarraíles cubiertos de publicidad borrosa y un coche de carreras entrando en ella."],
  "Ir al correfoc de la Mercè": [null,
    "Una horca de hierro con ruedas de fuego girando a toda velocidad, dejando estelas circulares en el aire de una calle estrecha."],
  "Ir al Burning Man": [null,
    "Una figura de madera enorme ardiendo de pie en medio de un desierto completamente llano, con el horizonte vacío alrededor."],
  "Comer en el Borough Market": [null,
    "El mostrador de un puesto de mercado con ruedas enteras de queso curado y una cuña abierta recién cortada a cuchillo, con el gentío pasando desenfocado detrás."],
  "Comer en el mercado de Chatuchak": [null,
    "El mostrador de un puesto de mercado con un wok de acero humeando sobre la llama y fideos salteándose, con el gentío pasando desenfocado detrás."],
  "Comer en el mercado de La Boqueria": [null,
    "El mostrador de un puesto de mercado con una hilera de vasos de zumo de colores distintos sobre hielo picado, con el gentío pasando desenfocado detrás."],
  "Comer en el Mercado de San Juan": [null,
    "El mostrador de un puesto de mercado con montones cónicos de chiles secos de distintos rojos, con el gentío pasando desenfocado detrás."],
  "Comer en el Mercado de San Miguel": [null,
    "La barra de un puesto de mercado cubierto con platitos de banderillas en palillo puestos en hilera, con el gentío apretado desenfocado detrás."],
  "Ir al Cruïlla": [null,
    "Una marea de manos levantadas en primer término, todas en silueta contra la luz blanca que viene del escenario."],
  "Ir al Glastonbury": ["lugar_vacio",
    "Una ladera entera de hierba cubierta de tiendas de campaña de colores plantadas unas junto a otras hasta arriba del todo, con el barro de los caminos entre ellas."],
  "Ir al Sónar": [null,
    "Un mar de cabezas en silueta visto desde atrás y, cruzando justo por encima de ellas, haces de láser verdes y finos dentro de una nube de humo."],
  "Probar las hormigas culonas": [null,
    "Un cuenco pequeño lleno hasta arriba de hormigas grandes tostadas, con los abdómenes redondos brillando."],
  "Probar los saltamontes fritos": [null,
    "Una pila de saltamontes fritos y rojizos en un cucurucho de papel, con una cuña de lima encima."],
  "Ver un partido del Mundial de fútbol": [null,
    "Desde la grada, el campo abajo y, en primer término y desenfocadas, banderas de muchos países distintos colgadas del voladizo."],
  "Ver un partido en el Camp Nou": [null,
    "Desde muy arriba, un estadio de tres anillos de grada que caen casi en vertical sobre un campo que se ve pequeñísimo."],
  "Ver un partido en el Muro Amarillo de Dortmund": [null,
    "Desde el césped, una grada entera de pie, sin asientos, completamente amarilla y vertical, llenando el encuadre."],
  "Ver una final de la Champions League": [null,
    "Desde la grada, el momento del trofeo: una copa de plata grande levantada entre muchas manos en el centro del campo, con las serpentinas plateadas cayendo alrededor y el césped lleno de papeles."],
  "Ver un partido en el Arthur Ashe del US Open": [null,
    "Desde la grada, una pista de tenis de superficie azul intenso, con un techo corredizo metálico medio abierto por encima."],
  "Ver un partido en la Philippe-Chatrier de Roland Garros": [null,
    "Desde la grada, una pista de tierra batida naranja recién rastrillada, con las marcas del rastrillo en diagonal."],
  "Ver un partido en la pista central de Wimbledon": [null,
    "Desde la grada, una pista de césped verde con las franjas de la siega bien marcadas y las líneas blancas recién pintadas."],
  "Ver una final de Grand Slam de tenis": [null,
    "Desde la grada, un trofeo de plata colocado sobre una mesa con faldón al lado de la red, en una pista vacía antes de la entrega."],
  "Ver una etapa de la Volta a Catalunya": [null,
    "Desde la cuneta, el pelotón pasando a ras por una carretera estrecha entre viñas bajas y muros de piedra seca."],
  "Ver una etapa de la Vuelta a España": [null,
    "Desde la cuneta, el pelotón cruzando una meseta reseca y sin sombra, con el calor temblando sobre el asfalto."],
  "Ver una etapa del Giro de Italia": [null,
    "Desde la cuneta, el pelotón subiendo un puerto con paredes de nieve apilada a los dos lados de la carretera."],
  // ── Los grupos de dos y tres, con su asunto propio ─────
  "Ver un partido en el Madison Square Garden": [null,
    "Desde el fondo, una grada circular que sube casi en vertical alrededor de una pista pequeña, cerrándose sobre ella."],
  "Ver una final de la NBA": [null,
    "Desde la grada, confeti dorado cayendo sobre un parqué de madera recién encerado y reflejándose en él."],
  "Comer en un restaurante con dos estrellas Michelin": [null,
    "Una campana de cristal levantándose sobre un plato y el humo aromático escapando por debajo en una nube."],
  "Dormir en el desierto de Wadi Rum": [null,
    "Una jaima negra de pelo de cabra montada al pie de una pared de arenisca roja y vertical, sin nadie."],
  "Dormir en una jaima en el Sáhara": [null,
    "Una jaima baja plantada en el valle entre dunas de arena fina y ondulada, con las crestas marcadas por el viento."],
  "Dormir en el refugio de Amitges": ["objeto",
    "Un par de botas de montaña gastadas, puestas una junto a otra y llenando el encuadre, sobre el poyo de piedra de un refugio, con el agua de un lago desenfocada detrás."],
  "Dormir una noche en un refugio de montaña": [null,
    "Una litera corrida de madera en un dormitorio común, con las mantas de cuadros dobladas en cada plaza y nadie dentro."],
  "Dormir en un bungalow sobre el agua en Bora Bora": [null,
    "Un bungalow de techo de hoja sobre agua turquesa, con una montaña verde y puntiaguda levantándose al fondo."],
  "Dormir en un bungalow sobre el agua en Maldivas": [null,
    "Una hilera larga de bungalows sobre pilotes unidos por una pasarela de madera completamente recta, sobre agua lisa."],
  "Ir a la Festa Major de Vilafranca": [null,
    "Dos gegants de madera y tela, altísimos y vestidos de terciopelo, girando en una plaza estrecha con todos los balcones de alrededor llenos de gente asomada."],
  "Ir al Carnaval de Cádiz": ["objeto",
    "Un bombo pequeño de chirigota con la correa colgando, apoyado en una silla plegable de madera en una plaza empedrada, con la baqueta encima del parche."],
  "Ir al Carnaval de Sitges": ["detalle",
    "Una hombrera de carnaval llena de lentejuelas y plumas de colores, en primerísimo plano y recortada contra el fondo oscuro de la calle, con cada lentejuela devolviendo la luz."],
  "Ir al Carnaval de Santa Cruz de Tenerife": ["detalle",
    "La cola bordada de un vestido de carnaval extendida sobre el asfalto, en primerísimo plano, con las piedras y los hilos de plata brillando y el asfalto oscuro alrededor."],
  "Probar el balut": ["detalle",
    "Un huevo abierto por la punta, en primerísimo plano y llenando el encuadre, con el pato a medio formar asomando por la abertura y el caldo brillando en el borde."],
  "Probar el huevo de cien años": ["detalle",
    "Media docena de mitades de huevo de cien años muy de cerca, la yema verde oscuro y cremosa y la clara ámbar translúcida casi negra, llenando todo el encuadre."],
  "Probar el cuy": [null,
    "Un animal pequeño asado entero y abierto sobre una fuente, dorado y con las patas estiradas."],
  "Probar la carne de cocodrilo": [null,
    "Filetes blancos de carne en una parrilla, con las marcas negras del hierro bien marcadas y el humo subiendo."],
  "Ver un partido del Mundial de rugby": [null,
    "Desde la grada, una melé cerrada de dos filas de jugadores empujando, con el barro saltando del césped."],
  "Ver un partido del Seis Naciones": [null,
    "Desde la grada, los postes en forma de hache y un balón ovalado pasando justo por encima del travesaño."],
  "Comer gambas de Palamós": [null,
    "Cuatro gambas rojas enteras puestas en fila sobre un plato blanco, con la cabeza, las antenas y las patas enteras, y una rodaja de limón al lado."],
  "Comer en un restaurante con una estrella Michelin": [null,
    "Un plato hondo y blanco sobre el que una jarrita vierte un hilo de salsa oscura en el momento de servir."],
  "Formar parte de un castell": [null,
    "Una torre humana vista desde justo debajo, subiendo en vertical hacia el cielo y perdiéndose de tamaño hacia arriba."],
  "Ir al Carnaval de Río": [null,
    "Un tocado de plumas enorme visto desde abajo, abriéndose contra las luces como un abanico."],
  "Ver un partido de la NBA": [null,
    "Desde la grada, un parqué de madera clara con las líneas pintadas y el aro visto de perfil, con la red colgando quieta."],
  "Ver un Gran Premio de Fórmula 1": [null,
    "Desde la grada, el semáforo de salida de cinco luces rojas encendidas colgando sobre el asfalto, con la parrilla de coches de carreras esperando debajo y el muro de boxes a un lado."],
  "Ver una etapa del Tour de Francia": [null,
    "Desde la cuneta, el pelotón pasando sobre un asfalto lleno de pintadas de colores, con la gente apretada dejando un pasillo estrecho."],
  "Ir a la Nit del Foc de las Fallas": [null,
    "La gente en silueta de espaldas, apretada en el borde de una plaza, mirando una estructura enorme de cartón y madera que arde entera delante de ellos."],
  "Ir a la Patum de Berga": [null,
    "La gente apelotonada en silueta llenando una plaza cerrada, con una cortina de chispas cayéndoles encima desde lo alto y los brazos levantados."],
  "Ir al Canet Rock": [null,
    "Una guitarra eléctrica levantada en alto y recortada en negro contra los focos de un escenario."],
  "Comer en los puestos de Jemaa el-Fna": [null,
    "El mostrador de un puesto de comida callejera con un cazo grande de latón lleno de caldo de caracoles sobre el fuego, con el gentío de la plaza desenfocado detrás."],
  "Comer en un hawker centre de Singapur": [null,
    "El mostrador de un puesto de comida con una bandeja metálica de compartimentos, arroz blanco en uno y tres guisos en los otros, con las mesas llenas desenfocadas detrás."],
  "Comerte un escorpión": [null,
    "Un escorpión entero servido en un plato pequeño de porcelana, con la cola curvada hacia arriba y el aguijón bien visible, y unos palillos apoyados en el borde."],
  "Comerte una tarántula": [null,
    "Una tarántula frita entera servida en un plato de papel, con las ocho patas peludas abiertas y una cuña de lima al lado."],
  "Beber en una carpa del Oktoberfest": ["lugar_vacio",
    "Dos mesas corridas de madera clara con sus bancos, vacías y vistas a lo largo, bajo la bóveda de lona a rayas de una carpa enorme con guirnaldas azules y blancas colgadas del techo."],
  "Ir a la Feria de Abril": [null,
    "Faroles de papel rojos y blancos colgados en hileras cruzadas sobre una calle de albero, encendidos y recortados contra el cielo oscuro, con las siluetas de la gente paseando debajo."],
  "Ver los fuegos de Nochevieja en Sídney": [null,
    "Desde la orilla, el arco de hierro de un puente enorme sobre el agua con cascadas de fuegos artificiales cayendo desde su barandilla, y la bahía negra reflejándolo todo."],
  "Ir al Saint Patrick's Day de Dublín": ["objeto",
    "Tres jarras de cerveza negra con la espuma blanca ya asentada sobre una barra de madera oscura, y un trébol de tres hojas dibujado en la espuma de la primera."],
  "Ir al Aplec del Caragol de Lleida": ["objeto",
    "Una llauna metálica abarrotada de caracoles a la brasa con unas ramas de romero encima, sobre las brasas encendidas, sin nadie alrededor."],
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
  "Hacer una vía ferrata": [null, "mediodía duro"],
  "Hacer la ferrata de Baumes Corcades": [null, "tarde larga"],
  "Hacer la ferrata de Boixadera dels Bancs": [null, "mediodía duro"],
  "Hacer la ferrata de Centelles": ["a ras de suelo", "día nublado"],
  "Hacer la ferrata de Les Baumes": ["a la altura de los ojos", "tarde larga"],
  "Hacer la ferrata del Salt del Grill": ["contrapicado", "día nublado"],
  "Hacer barranquismo en la Noguera": [null, "interior"],
  "Hacer rafting": [null, "mediodía duro"],
  "Hacer rafting por el Noguera Pallaresa": [null, "mediodía duro"],
  "Hacer el Camino de Santiago": ["a la altura de los ojos", "amanecer"],
  "Hacer el Camino de Santiago desde Montserrat": [null, "día nublado"],
  "Hacer el Camí dels Bons Homes": ["a la altura de los ojos", "tarde larga"],
  "Hacer la Matagalls-Montserrat": ["a ras de suelo", "amanecer"],
  "Hacer la ruta de las nueve ermitas del Montsant": ["a la altura de los ojos", "mediodía duro"],
  "Hacer la Vía Verde del Carrilet de Olot a Girona": ["a ras de suelo", "día nublado"],
  "Hacer los Carros de Foc": ["a la altura de los ojos", "amanecer"],
  "Hacer la Travessia del Port de Barcelona nadando": [null, "tarde larga"],
  "Hacer paddle surf en el cabo de Creus": ["a ras de suelo", "amanecer"],
  "Hacer un safari en el Masái Mara": [null, "tarde larga"],
  "Hacer un safari en el Serengeti": [null, "mediodía duro"],
  "Hacer una marcha cicloturista de montaña": ["a ras de suelo", "tarde larga"],
  "Hacer una ruta en moto de varios días": ["a la altura de los ojos", "tarde larga"],
  "Bañarte en Bondi Beach": ["a ras de suelo", "amanecer"],
  "Bañarte en Cala Estreta": [null, "mediodía duro"],
  "Bañarte en la cala de Sa Tuna": ["a la altura de los ojos", "tarde larga"],
  "Bañarte en la Laguna Azul": [null, "día nublado"],
  "Bañarte en la playa de Copacabana": ["a la altura de los ojos", "amanecer"],
  "Bañarte en las terrazas de Pamukkale": ["contrapicado", "tarde larga"],
  "Bañarte en los Baños Széchenyi": ["cenital", "día nublado"],
  "Bañarte en los gorgs de la Garrotxa": [null, "interior"],
  "Bañarte en Santa Monica": ["a ras de suelo", "tarde larga"],
  "Bañarte en South Beach": ["a la altura de los ojos", "mediodía duro"],
  "Bañarte en una playa de arena negra de Santorini": [null, "mediodía duro"],
  "Navegar el Bósforo en barco": ["cenital", "día nublado"],
  "Navegar entre los islotes de El Nido": [null, "mediodía duro"],
  "Navegar por el Amazonas": [null, "día nublado"],
  "Navegar por el delta del Ebro": ["a ras de suelo", "tarde larga"],
  "Navegar por el delta del Okavango": ["a ras de suelo", "amanecer"],
  "Navegar por el río Chao Phraya": [null, "tarde larga"],
  "Navegar por el río Li en Guilin": [null, "amanecer"],
  "Navegar por la bahía de Ha Long": ["desde muy cerca", "tarde larga"],
  "Navegar por los fiordos noruegos": [null, "día nublado"],
  "Navegar por Milford Sound": [null, "día nublado"],
  "Correr un 10K": ["a la altura de los ojos", "amanecer"],
  "Correr la Cursa dels Bombers": ["cenital", "mediodía duro"],
  "Correr la Mitja de Granollers": ["contrapicado", "tarde larga"],
  "Correr la Ultra Pirineu": ["contrapicado", null],
  "Correr un maratón": [null, "amanecer"],
  "Correr un ultratrail": ["a la altura de los ojos", "día nublado"],
  "Correr una media maratón": ["desde muy cerca", "mediodía duro"],
  "Montar en el London Eye": [null, "tarde larga"],
  "Montar en el Star Ferry": ["a la altura de los ojos", "día nublado"],
  "Montar en el tranvía 28 de Lisboa": ["a la altura de los ojos", "interior"],
  "Montar en el tranvía de San Francisco": [null, "mediodía duro"],
  "Montar en skateboard": ["cenital", "tarde larga"],
  "Montar en un coche clásico por La Habana": ["desde muy cerca", "mediodía duro"],
  "Subir en bici al Angliru": [null, "día nublado"],
  "Subir en bici al Alpe d'Huez": ["cenital", "tarde larga"],
  "Subir en bici al Mont Ventoux": [null, "mediodía duro"],
  "Subir en bici a la Rabassa": ["a la altura de los ojos", "día nublado"],
  "Subir en bici al Port del Cantó": ["a la altura de los ojos", "día nublado"],
  "Subir un puerto de primera categoría en bici": [null, "tarde larga"],
  "Terminar un Ironman": ["a la altura de los ojos", "interior"],
  "Terminar un medio Ironman": [null, "mediodía duro"],
  "Terminar un triatlón olímpico": ["a la altura de los ojos", "amanecer"],
  "Terminar una Hyrox": ["a ras de suelo", "interior"],
  "Volar en globo sobre la Capadocia": ["contrapicado", "amanecer"],
  "Volar en globo sobre los volcanes de la Garrotxa": [null, "amanecer"],
  "Volar en globo sobre Luxor": [null, "amanecer"],
  "Volar en parapente": ["cenital", "tarde larga"],
  "Bucear a más de 30 metros": [null, "interior"],
  "Bucear en las islas Medes": [null, "interior"],
  "Bucear en Raja Ampat": ["a la altura de los ojos", "mediodía duro"],
  "Llegar al Cabo de Buena Esperanza": ["a la altura de los ojos", "día nublado"],
  "Llegar al Cabo Norte": ["contrapicado", "día nublado"],
  "Llegar al campo base del Everest": ["a la altura de los ojos", "mediodía duro"],
  "Recorrer el carril bici más largo del mundo": ["a ras de suelo", "mediodía duro"],
  "Recorrer el Freedom Trail": [null, "día nublado"],
  "Recorrer un GR entero": ["a la altura de los ojos", "amanecer"],
  "Bajar a la montaña de sal de Cardona": ["a la altura de los ojos", "interior"],
  "Bajar al cráter del volcán Santa Margarida": ["contrapicado", "tarde larga"],
  "Escalar en Siurana": [null, "tarde larga"],
  "Escalar una aguja de Montserrat": ["contrapicado", null],
  "Saltar en puenting": [null, "mediodía duro"],
  "Saltar en puenting en Queenstown": ["cenital", "día nublado"],
  "Beber una cerveza en la Hofbräuhaus": ["a la altura de los ojos", "interior"],
  "Dar una vuelta al Nürburgring": [null, "día nublado"],
  "Escuchar jazz en directo en Bourbon Street": ["a la altura de los ojos", "interior"],
  "Jugar en el Old Course de St Andrews": ["a ras de suelo", "día nublado"],
  "Lanzar una moneda en la Fontana di Trevi": [null, "interior"],
  "Pasear en góndola por Venecia": ["desde muy cerca", "tarde larga"],
  "Perderte en los zocos de Marrakech": ["contrapicado", "interior"],
  "Pilotar un kart": ["a ras de suelo", "mediodía duro"],
  "Pisar la Antártida": ["a la altura de los ojos", "día nublado"],
  "Salir por el Temple Bar": ["a la altura de los ojos", "interior"],
  "Tomar un café en el Café Central": ["cenital", "interior"],
  "Practicar CrossFit": ["a ras de suelo", "interior"],
  "Practicar golf": ["desde muy cerca", "amanecer"],
  "Practicar pádel": ["a la altura de los ojos", "tarde larga"],
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
  "Practicar escalada en hielo": [null, "día nublado"],
  "Practicar motocross": [null, "día nublado"],
  "Practicar patinaje sobre hielo": [null, "interior"],
  "Practicar escalada en rocódromo": ["contrapicado", "interior"],
  "Practicar esquí": [null, "mediodía duro"],
  "Practicar vela": [null, "día nublado"],
  "Hacer cumbre en el Kilimanjaro": ["contrapicado", "mediodía duro"],
  "Hacer cumbre en un cuatromil": [null, "amanecer"],
  "Hacer cumbre en un dosmil": ["contrapicado", "día nublado"],
  "Hacer cumbre en un tresmil": [null, "mediodía duro"],
  "Hacer un safari por el desierto de Dubái": ["a la altura de los ojos", "tarde larga"],
  "Hacer una travesía de varios días en montaña": ["a ras de suelo", "amanecer"],
  "Nadar en aguas abiertas una travesía": ["cenital", "amanecer"],
  // ── Las de la tanda de cuarenta ─────────────────────────
  // Su encuadre lo eligió una regla, así que no habían pasado por aquí. Sin
  // esto, las 8 de plato saldrían con el mismo ángulo y la misma luz, que es
  // justo el problema que este eje existe para evitar, en una tanda de 40.
  "Comerte un escorpión": [null, "interior"],
  "Comerte una tarántula": [null, "mediodía duro"],
  "Hacer una calçotada en Valls": [null, "tarde larga"],
  "Comer en un hawker centre de Singapur": [null, "interior"],
  "Comer gambas de Palamós": [null, "mediodía duro"],
  "Comer en un restaurante con una estrella Michelin": [null, "tarde larga"],
  "Comer en los puestos de Jemaa el-Fna": [null, "interior"],
  "Comer xató en Vilanova": [null, "día nublado"],
  "Formar parte de un castell": ["contrapicado", null],
  "Ir a la Nit del Foc de las Fallas": ["a ras de suelo", null],
  "Ir al Carnaval de Río": ["a la altura de los ojos", null],
  "Ir a la Feria de Abril": ["a la altura de los ojos", null],
  "Ir al Canet Rock": ["contrapicado", null],
  "Ir a la Patum de Berga": ["a ras de suelo", null],
  "Beber en una carpa del Oktoberfest": ["a ras de suelo", "interior"],
  "Hacerte un tatuaje": ["desde muy cerca", "interior"],
  "Dar una charla ante más de cien personas": ["a ras de suelo", null],
  "Donar médula": ["cenital", "interior"],
  "Tocar un instrumento delante de público": ["a la altura de los ojos", "tarde larga"],
  "Montar tu propia empresa": ["a la altura de los ojos", "día nublado"],
  "Terminar una carrera universitaria": ["contrapicado", "tarde larga"],
  "Ver un Gran Premio de Fórmula 1": [null, "mediodía duro"],
  "Ver un partido de la NBA": [null, "interior"],
  "Ver una etapa del Tour de Francia": [null, "tarde larga"],
  "Ver la Nochevieja en Times Square": [null, "interior"],
  "Ver una procesión de la Semana Santa de Sevilla": [null, "interior"],
  "Ver el festival de globos de Albuquerque": [null, "amanecer"],
  "Pasar un día en PortAventura": ["contrapicado", "tarde larga"],
  "Sacarte el carnet de moto": ["cenital", "día nublado"],
  "Sacarte la licencia de piloto": ["desde muy cerca", "interior"],
  "Doctorarte": ["cenital", "interior"],
  "Vivir un año en otro país": ["a la altura de los ojos", "tarde larga"],
  "Actuar en un escenario": ["a la altura de los ojos", "interior"],
  "Conducir un coche de carreras en circuito": ["desde muy cerca", "interior"],
  "Hacer una cata de whisky en una destilería": ["a la altura de los ojos", "interior"],
  "Mudarte a otro continente": ["a la altura de los ojos", "interior"],
  "Bailar salsa": ["a la altura de los ojos", null],
  "Bailar tango": [null, "interior"],
  "Hacer un voluntariado en el extranjero": [null, "mediodía duro"],
  "Pilotar una avioneta": [null, "día nublado"],
  "Probar el fugu": [null, "interior"],
  "Cantar en un karaoke": ["desde muy cerca", null],
  "Correr un encierro de San Fermín": ["a ras de suelo", null],
  "Ir a la Festa dels Raiers": ["a ras de suelo", null],
  "Ir a la Festa Major de Gràcia": ["contrapicado", null],
  "Ir a la Festa Major de Vilafranca": ["contrapicado", null],
  "Ir a la Fira de Santa Llúcia": ["a la altura de los ojos", null],
  "Ir a unos Juegos Olímpicos": ["contrapicado", null],
  "Ir a unos Juegos Olímpicos de invierno": ["a la altura de los ojos", null],
  "Ir al Aplec del Caragol de Lleida": ["desde muy cerca", "tarde larga"],
  "Ir al Burning Man": ["contrapicado", null],
  "Ir al Carnaval de Cádiz": ["a la altura de los ojos", "tarde larga"],
  "Ir al Carnaval de Santa Cruz de Tenerife": [null, "interior"],
  "Ir al Carnaval de Sitges": [null, "interior"],
  "Ir al Carnaval de Venecia": ["desde muy cerca", null],
  "Ir al correfoc de la Mercè": ["a ras de suelo", null],
  "Ir al Cruïlla": ["contrapicado", null],
  "Ir al Festival de Cine de Sitges": ["a la altura de los ojos", null],
  "Ir al Glastonbury": ["a la altura de los ojos", "día nublado"],
  "Ir al Saint Patrick's Day de Dublín": ["desde muy cerca", "interior"],
  "Ir al Sónar": ["contrapicado", null],
  "Jugar al Holi en India": ["desde muy cerca", null],
  "Mojarte en el Songkran": ["desde muy cerca", null],
  "Pasar un día en Ferrari Land": ["contrapicado", "tarde larga"],
  "Sacarte el título de buceo Open Water": ["contrapicado", null],
  "Soltar un farolillo en el Yi Peng": ["contrapicado", null],
  "Tirar tomates en La Tomatina": ["a ras de suelo", null],
  "Ver los fuegos de Nochevieja en Sídney": [null, "tarde larga"],
  "Ver un Gran Premio de MotoGP": [null, "mediodía duro"],
  "Ver un Gran Premio en Montmeló": [null, "mediodía duro"],
  "Ver un lanzamiento de un cohete": [null, "amanecer"],
  "Ver un partido del Mundial de fútbol": [null, "tarde larga"],
  "Ver un partido del Mundial de rugby": [null, "día nublado"],
  "Ver un partido del Seis Naciones": [null, "día nublado"],
  "Ver un partido en el Arthur Ashe del US Open": [null, "mediodía duro"],
  "Ver un partido en el Camp Nou": [null, "tarde larga"],
  "Ver un partido en el Madison Square Garden": [null, "interior"],
  "Ver un partido en el Muro Amarillo de Dortmund": [null, "tarde larga"],
  "Ver un partido en la Philippe-Chatrier de Roland Garros": [null, "mediodía duro"],
  "Ver un partido en la pista central de Wimbledon": [null, "tarde larga"],
  "Ver una carrera en el circuito de Mónaco": [null, "mediodía duro"],
  "Ver una carrera en Indianápolis": [null, "mediodía duro"],
  "Ver una carrera en Monza": [null, "día nublado"],
  "Ver una carrera en Silverstone": [null, "día nublado"],
  "Ver una carrera en Spa-Francorchamps": [null, "día nublado"],
  "Ver una etapa de la Volta a Catalunya": [null, "amanecer"],
  "Ver una etapa de la Vuelta a España": [null, "mediodía duro"],
  "Ver una etapa del Giro de Italia": [null, "tarde larga"],
  "Ver una etapa del Rally Dakar": [null, "amanecer"],
  "Ver una final de Grand Slam de tenis": [null, "interior"],
  "Ver una final de la Champions League": [null, "tarde larga"],
  "Ver una final de la NBA": [null, "interior"],
  "Ver una regata de la Copa América de vela": [null, "mediodía duro"],
  "Comer arroz en el Delta del Ebro": [null, "tarde larga"],
  "Comer cargols a la llauna en Lleida": [null, "mediodía duro"],
  "Comer en el Borough Market": [null, "día nublado"],
  "Comer en el mercado de Chatuchak": [null, "mediodía duro"],
  "Comer en el mercado de La Boqueria": [null, "interior"],
  "Comer en el Mercado de San Juan": [null, "interior"],
  "Comer en el Mercado de San Miguel": [null, "interior"],
  "Comer en el mercado de Toyosu": [null, "amanecer"],
  "Comer en un restaurante con dos estrellas Michelin": [null, "interior"],
  "Comer suquet de peix en la Costa Brava": [null, "tarde larga"],
  "Comer un pastel de Belém": [null, "mediodía duro"],
  "Comer una pizza napolitana en Nápoles": [null, "interior"],
  "Probar el balut": [null, "día nublado"],
  "Probar el café kopi luwak": [null, "amanecer"],
  "Probar el casu marzu": [null, "día nublado"],
  "Probar el cuy": [null, "mediodía duro"],
  "Probar el durián": [null, "mediodía duro"],
  "Probar el haggis": [null, "interior"],
  "Probar el huevo de cien años": [null, "tarde larga"],
  "Probar el pulpo vivo": [null, "día nublado"],
  "Probar el surströmming": [null, "día nublado"],
  "Probar la carne de cocodrilo": [null, "tarde larga"],
  "Probar las hormigas culonas": [null, "mediodía duro"],
  "Probar los saltamontes fritos": [null, "tarde larga"],
  "Tomar una cerveza en el Guinness Storehouse": [null, "interior"],
  "Sacarte el cinturón negro": [null, "interior"],
  "Dormir en el desierto de Wadi Rum": ["a ras de suelo", "tarde larga"],
  "Dormir en una jaima en el Sáhara": ["contrapicado", "amanecer"],
  "Dormir en el refugio de Amitges": ["a la altura de los ojos", "tarde larga"],
  "Dormir una noche en un refugio de montaña": ["desde muy cerca", "interior"],
  "Dormir en un bungalow sobre el agua en Bora Bora": ["cenital", "mediodía duro"],
  "Dormir en un bungalow sobre el agua en Maldivas": ["a ras de suelo", "mediodía duro"],
  "Hacer una cata de vinos en una bodega": ["cenital", "interior"],
  "Bañarte en la piscina del Marina Bay Sands": ["a la altura de los ojos", "tarde larga"],
  "Caminar sobre un glaciar en Islandia": ["a ras de suelo", "día nublado"],
  "Correr la Marató de Barcelona": ["contrapicado", "amanecer"],
  "Dormir en una cabaña sin electricidad": ["a la altura de los ojos", "interior"],
  "Flotar en el mar Muerto": ["cenital", "mediodía duro"],
  "Terminar un máster": ["a la altura de los ojos", "interior"],
  "Ver un eclipse solar total": ["contrapicado", "día nublado"],
  "Publicar un libro": ["desde muy cerca", "interior"],
  "Sacarte el C1 de inglés": ["cenital", "día nublado"],
  "Sacarte el título de patrón de embarcaciones": ["a ras de suelo", "amanecer"],
  "Ver una velada de boxeo por un título mundial": ["contrapicado", "interior"],
  "Saltar en paracaídas": ["contrapicado", "mediodía duro"],
}

/**
 * LAS QUE YA ESTÁN APROBADAS MIRÁNDOLAS. No se vuelven a generar.
 *
 * De las doce primeras pruebas y de las ocho repetidas, estas seis pasaron
 * la prueba de la tarjeta a 144 y a 179 px. Están aquí para que una tanda
 * futura no las pise: lo que ya está bien no se vuelve a tirar a la ruleta.
 */
export const APROBADAS = new Set([
  'Bucear en las islas Medes',            // detalle, 9-10-2026
  'Montar en el tranvía 28 de Lisboa',    // lugar_vacio
  'Terminar un triatlón olímpico',        // lugar_vacio
  'Hacer una vía ferrata',                // manos
  'Lanzar una moneda en la Fontana di Trevi', // detalle, a la segunda
  'Sacarte el cinturón negro',            // manos, a la segunda

  // ── La vuelta del 10-10-2026, decididas una a una mirándolas GRANDES ──
  //
  // Importa saber de qué carpeta sale cada una, porque de seis de ellas hay
  // dos versiones y la buena no es la última: «mirar grande antes de
  // condenar» hizo volver a cinco a su foto anterior.
  //
  // De "Claude outputs/doce/" — la vuelta nueva, que mejora:
  'Comer gambas de Palamós',              // plato, sin el torso de antes
  'Ir al Carnaval de Sitges',             // detalle: el contraluz se comía las lentejuelas
  'Ir al Carnaval de Santa Cruz de Tenerife', // detalle, por lo mismo
  'Probar el huevo de cien años',         // detalle: en 'plato' no se distinguía del balut
  'Probar el balut',                      // detalle, por lo mismo
  'Ir a la Festa Major de Vilafranca',    // gegants: era la misma foto que el castell
  //
  // De "Claude outputs/pequenos/" — LA VIEJA SE QUEDA. Se rehicieron y
  // salieron peor, porque una escena escrita como corrección se lleva por
  // delante lo que no menciona:
  'Dormir en un bungalow sobre el agua en Bora Bora',
  'Dormir en el desierto de Wadi Rum',
  'Dormir en una jaima en el Sáhara',
  'Ver un partido en el Madison Square Garden',
  'Formar parte de un castell',
  'Probar el cuy',                        // y por ella se corrigió la regla de 'plato'
])

/**
 * SUJETOS QUE EL MODELO NO SABE HACER.
 *
 * Lo útil de esta lista no son los nombres: es reconocer LA FORMA DEL FALLO
 * la próxima vez. Por eso cada uno lleva escrito lo que pasó en cada intento.
 *
 * ── CUÁNDO SE ENTRA AQUÍ ──────────────────────────────────
 *
 *     Si un sujeto falla DOS veces con DOS ENCUADRES DISTINTOS, se anota
 *     aquí y se le busca foto en Commons, en vez de probar un tercero.
 *
 * El umbral es dos y no tres a propósito: el pádel costó CUATRO intentos y
 * cuatro encuadres, y lo que hay que conseguir es que se note al segundo.
 * Dos fallos con el MISMO encuadre siguen significando otra cosa —que el
 * encuadre está mal y hay que cambiarlo—; son dos cuentas distintas.
 *
 * Lo que va aquí NO se genera: se queda con su foto de Commons.
 */
export const NO_SABE_HACERLO = {
  'Practicar pádel': [
    'objeto, la pala y la pelota en el suelo de la pista → salió una pista vacía, sin pala',
    'detalle, la cara de la pala con sus agujeros → salió una zona en penumbra con un cristal',
    'hombros, la pala en la mano al golpear → salió un torso naranja y ningún objeto',
    'y una cuarta con otra escena del mismo encuadre → igual',
    'LA FORMA DEL FALLO: el modelo pinta el SITIO (una pista acristalada) y se',
    'salta el objeto, lo pongas donde lo pongas. No es cómo se mira: es que esa',
    'cosa no existe para él. Se queda con su foto de Commons.',
    'CLASE: el modelo no sabe hacerlo. Se descubrió probando, y no había otra.',
  ],
  'Ir al Carnaval de Cádiz': [
    'contraluz, el coro apretado cantando en una esquina → una cabeza oscura contra una masa, igual que otras cinco fiestas',
    'contraluz, el bombo de chirigota delante y el coro detrás → el bombo no salió: el encuadre nombra persona y gana él',
    'objeto, el bombo apoyado en una silla en una plaza → se lee «una silla», no se lee «chirigota»',
    'CLASE: NO PODEMOS HACERLO NOSOTROS. Y esta es la diferencia que importa:',
    'una chirigota se reconoce por CARAS DE GENTE DISFRAZADA CANTANDO, y las',
    'caras las prohíben nuestras propias reglas. No es que el modelo no sepa: es',
    'que lo que haría falta está vetado de antemano. Se queda con Commons.',
  ],
}

/**
 * EL ELEMENTO CENTRAL de cada decisión, en un vocabulario corto.
 *
 * Para qué: el aviso de escenas gemelas compara la prosa, y así NO caza dos
 * fotos que son la misma con palabras distintas. «Ir a la Nit del Foc» y «Ir
 * a la Patum de Berga» son las dos una silueta contra el fuego y no comparten
 * casi ninguna palabra.
 *
 * Se DECIDE, no se deduce: la primera versión lo sacaba buscando palabras en
 * la escena y daba 37 «agua», porque esa palabra aparece de refilón en media
 * escena del catálogo.
 *
 * Y el elemento es LO QUE SE VE, nunca cómo se mira. La primera versión
 * ponía «vista desde los ojos» a los de primera_persona y «persona de
 * espaldas» a los de espaldas: eso repite el encuadre y agrupaba 16 gooals
 * por una obviedad, que es lo mismo que no avisar de nada.
 *
 * Y el vocabulario es corto a propósito. Si hubiera cincuenta elementos
 * distintos, dos escenas no caerían nunca en el mismo y el campo no serviría
 * para comparar nada.
 */
export const ELEMENTO = {
  "Hacer una vía ferrata": "equipo de escalada",
  "Hacer la ferrata de Baumes Corcades": "grapa en la roca",
  "Hacer la ferrata de Boixadera dels Bancs": "pared de roca",
  "Hacer la ferrata de Centelles": "equipo de escalada",
  "Hacer la ferrata de Les Baumes": "puente de cable",
  "Hacer la ferrata del Salt del Grill": "pared de roca",
  "Escalar en Siurana": "cinta exprés",
  "Escalar una aguja de Montserrat": "aguja de roca",
  "Hacer barranquismo en la Noguera": "garganta de roca",
  "Hacer rafting": "agua en movimiento",
  "Hacer rafting por el Noguera Pallaresa": "agua blanca en roca",
  "Hacer el Camino de Santiago": "bordón y concha",
  "Hacer el Camino de Santiago desde Montserrat": "flecha pintada",
  "Hacer el Camí dels Bons Homes": "sendero hacia un collado",
  "Hacer la Matagalls-Montserrat": "camino en hayedo",
  "Hacer la ruta de las nueve ermitas del Montsant": "arco de piedra de una ermita",
  "Hacer la Vía Verde del Carrilet de Olot a Girona": "boca de túnel de piedra",
  "Hacer los Carros de Foc": "puerta de refugio",
  "Recorrer el carril bici más largo del mundo": "carril recto al horizonte",
  "Recorrer el Freedom Trail": "línea de ladrillo",
  "Recorrer un GR entero": "mochila en mojón",
  "Hacer una travesía de varios días en montaña": "saco y esterilla en la hierba",
  "Hacer la Travessia del Port de Barcelona nadando": "boyas",
  "Nadar en aguas abiertas una travesía": "boyas",
  "Hacer paddle surf en el cabo de Creus": "tabla y remo varados",
  "Hacer un safari en el Masái Mara": "sabana con animales",
  "Hacer un safari en el Serengeti": "lomo de cebra",
  "Hacer un safari por el desierto de Dubái": "todoterreno en duna",
  "Hacer una marcha cicloturista de montaña": "bici con barro",
  "Hacer una ruta en moto de varios días": "equipaje de viaje",
  "Subir en bici al Angliru": "rampa de carretera",
  "Subir en bici al Alpe d'Huez": "lazadas encadenadas",
  "Subir en bici al Mont Ventoux": "asfalto",
  "Subir en bici a la Rabassa": "bici en mojón",
  "Subir en bici al Port del Cantó": "postes de nieve en la cuneta",
  "Subir un puerto de primera categoría en bici": "pieza de bicicleta",
  "Montar en skateboard": "monopatín",
  "Pilotar un kart": "kart en el pit lane",
  "Dar una vuelta al Nürburgring": "carretera vacía",
  "Conducir un coche de carreras en circuito": "volante",
  "Bañarte en Bondi Beach": "tablas clavadas en la arena",
  "Bañarte en Cala Estreta": "borde de roca sobre agua clara",
  "Bañarte en la cala de Sa Tuna": "barcas varadas",
  "Bañarte en la Laguna Azul": "agua termal",
  "Bañarte en la playa de Copacabana": "paseo urbano",
  "Bañarte en las terrazas de Pamukkale": "terrazas de cal",
  "Bañarte en los Baños Széchenyi": "piscina con fachada",
  "Bañarte en los gorgs de la Garrotxa": "chorro en poza",
  "Bañarte en Santa Monica": "muelle de madera",
  "Bañarte en South Beach": "mobiliario de playa",
  "Bañarte en una playa de arena negra de Santorini": "playa",
  "Navegar el Bósforo en barco": "cabo o amarre",
  "Navegar entre los islotes de El Nido": "islotes de roca",
  "Navegar por el Amazonas": "agua del río en la proa",
  "Navegar por el delta del Ebro": "barca entre arrozales",
  "Navegar por el delta del Okavango": "canoa con pértiga",
  "Navegar por el río Chao Phraya": "estela en el agua",
  "Navegar por el río Li en Guilin": "montes en niebla",
  "Navegar por la bahía de Ha Long": "vela de junco",
  "Navegar por los fiordos noruegos": "pared de fiordo",
  "Navegar por Milford Sound": "cascada",
  "Correr la Cursa dels Bombers": "masa de gente",
  "Correr la Mitja de Granollers": "calle estrecha de pueblo",
  "Correr la Ultra Pirineu": "cresta de montaña",
  "Correr un maratón": "espaldas de los de delante",
  "Correr un ultratrail": "sendero",
  "Correr una media maratón": "reloj deportivo",
  "Correr un 10K": "paseo marítimo vacío",
  "Montar en el London Eye": "ciudad desde el aire",
  "Montar en el Star Ferry": "mobiliario de transporte",
  "Montar en el tranvía 28 de Lisboa": "interior de tranvía de madera",
  "Montar en el tranvía de San Francisco": "pieza de vehículo",
  "Montar en un coche clásico por La Habana": "pieza de vehículo",
  "Terminar un Ironman": "medalla o diploma",
  "Terminar un medio Ironman": "equipo deportivo",
  "Terminar un triatlón olímpico": "zona deportiva vacía",
  "Terminar una Hyrox": "equipo deportivo",
  "Volar en globo sobre la Capadocia": "tela de globo",
  "Volar en globo sobre los volcanes de la Garrotxa": "campos desde el aire",
  "Volar en globo sobre Luxor": "quemador",
  "Volar en parapente": "vela extendida en hierba",
  "Pilotar una avioneta": "hélice y campos",
  "Bucear a más de 30 metros": "fondo marino",
  "Bucear en las islas Medes": "gorgonia roja",
  "Bucear en Raja Ampat": "fondo marino",
  "Llegar al Cabo de Buena Esperanza": "acantilado",
  "Llegar al Cabo Norte": "esfera de hierro",
  "Llegar al campo base del Everest": "banderas de oración",
  "Hacer cumbre en el Kilimanjaro": "nieve o hielo",
  "Hacer cumbre en un cuatromil": "mar de nubes",
  "Hacer cumbre en un dosmil": "buzón de cima",
  "Hacer cumbre en un tresmil": "nieve o hielo",
  "Pisar la Antártida": "hielo varado en playa negra",
  "Bajar a la montaña de sal de Cardona": "pared de sal veteada",
  "Bajar al cráter del volcán Santa Margarida": "paisaje de cráter",
  "Saltar en puenting": "equipo de salto",
  "Saltar en puenting en Queenstown": "pasarela en voladizo",
  "Beber una cerveza en la Hofbräuhaus": "jarra de litro",
  "Escuchar jazz en directo en Bourbon Street": "instrumento",
  "Jugar en el Old Course de St Andrews": "campo deportivo",
  "Lanzar una moneda en la Fontana di Trevi": "monedas",
  "Pasear en góndola por Venecia": "proa de góndola",
  "Perderte en los zocos de Marrakech": "lámparas de metal colgadas",
  "Salir por el Temple Bar": "calle urbana",
  "Tomar un café en el Café Central": "taza en velador",
  "Vivir un año en otro país": "balcón",
  "Probar el fugu": "plato",
  "Hacer un voluntariado en el extranjero": "manos",
  "Terminar una carrera universitaria": "birrete en el aire",
  "Hacer una cata de whisky en una destilería": "bebida",
  "Actuar en un escenario": "micrófono",
  "Mudarte a otro continente": "carro de maletas de espaldas",
  "Bailar salsa": "pareja bailando",
  "Bailar tango": "calzado",
  "Dar una charla ante más de cien personas": "escenario con público",
  "Donar médula": "tubo y bolsa",
  "Hacerte un tatuaje": "máquina de tatuar",
  "Montar tu propia empresa": "persiana de local",
  "Tocar un instrumento delante de público": "instrumento",
  // ── Los 140 que montan el prompt desde el título ───────
  //
  // No llevan escena escrita y puede que no la necesiten: «Ir a la Nit del
  // Foc» no la tiene y es de las mejores de la tanda. Lo que sí necesitaban
  // es esto, porque sin elemento el detector de gemelas no las ve — y son
  // justo donde están las parejas evidentes: cuatro fuegos, cinco mercados,
  // ocho circuitos, cuatro escenarios de concierto.
  "Practicar esquí": "pendiente nevada",
  "Practicar vela": "vela tensa desde cubierta",
  "Ver el festival de globos de Albuquerque": "globos en el aire",
  "Ver la Nochevieja en Times Square": "calle urbana iluminada",
  "Ver los fuegos de Nochevieja en Sídney": "puente con cascada de fuegos",
  "Ver un Gran Premio de Fórmula 1": "semáforo de salida",
  "Ver un Gran Premio de MotoGP": "moto tumbada en curva",
  "Ver un Gran Premio en Montmeló": "curva lenta de 180 grados",
  "Ver una carrera en el circuito de Mónaco": "quitamiedos junto a los yates",
  "Ver una carrera en Indianápolis": "franja de ladrillo",
  "Ver una carrera en Monza": "curva peraltada entre árboles",
  "Ver una carrera en Silverstone": "pista llana con hangares",
  "Ver una carrera en Spa-Francorchamps": "subida ciega entre bosque",
  "Ver un lanzamiento de un cohete": "cohete despegando",
  "Ver un partido de la NBA": "parqué y aro de lado",
  "Ver una final de la NBA": "confeti dorado en el parqué",
  "Ver un partido en el Madison Square Garden": "grada circular muy vertical",
  "Ver un partido del Mundial de fútbol": "banderas de muchos países",
  "Ver un partido en el Camp Nou": "grada de tres anillos",
  "Ver un partido en el Muro Amarillo de Dortmund": "grada de pie amarilla",
  "Ver una final de la Champions League": "copa levantada entre manos",
  "Ver un partido del Mundial de rugby": "melé cerrada",
  "Ver un partido del Seis Naciones": "postes en H con el balón",
  "Ver un partido en el Arthur Ashe del US Open": "pista azul bajo techo corredizo",
  "Ver un partido en la Philippe-Chatrier de Roland Garros": "tierra batida naranja",
  "Ver un partido en la pista central de Wimbledon": "césped con franjas segadas",
  "Ver una final de Grand Slam de tenis": "trofeo junto a la red",
  "Ver una etapa de la Volta a Catalunya": "pelotón entre viñas",
  "Ver una etapa de la Vuelta a España": "pelotón en meseta seca",
  "Ver una etapa del Giro de Italia": "pelotón entre nieve",
  "Ver una etapa del Tour de Francia": "público pintado en el asfalto",
  "Ver una etapa del Rally Dakar": "coche en pista de tierra",
  "Ver una procesión de la Semana Santa de Sevilla": "procesión en calle estrecha",
  "Ver una regata de la Copa América de vela": "veleros en regata",
  "Beber en una carpa del Oktoberfest": "mesas corridas vacías",
  "Cantar en un karaoke": "pantalla y micrófono",
  "Correr un encierro de San Fermín": "calle estrecha con toros",
  "Formar parte de un castell": "torre humana desde abajo",
  "Ir a la Festa Major de Vilafranca": "gegants entre balcones",
  "Ir a la Feria de Abril": "faroles colgados sobre el albero",
  "Ir a la Festa dels Raiers": "río y troncos",
  "Ir a la Festa Major de Gràcia": "calle engalanada",
  "Ir a la Fira de Santa Llúcia": "mercado de Navidad",
  "Ir a la Nit del Foc de las Fallas": "gente mirando el monumento arder",
  "Ir a la Patum de Berga": "gente bajo la lluvia de chispas",
  "Ir al correfoc de la Mercè": "horca de fuego girando",
  "Ir al Burning Man": "figura de madera ardiendo en el desierto",
  "Ir a unos Juegos Olímpicos": "estadio iluminado",
  "Ir a unos Juegos Olímpicos de invierno": "pista nevada iluminada",
  "Ir al Aplec del Caragol de Lleida": "llauna de caracoles a la brasa",
  "Ir al Canet Rock": "guitarra contra los focos",
  "Ir al Cruïlla": "marea de manos levantadas",
  "Ir al Glastonbury": "ladera de tiendas",
  "Ir al Sónar": "cabezas bajo los láseres",
  "Ir al Carnaval de Cádiz": "bombo de chirigota",
  "Ir al Carnaval de Sitges": "hombrera de lentejuelas",
  "Ir al Carnaval de Río": "tocado de plumas desde abajo",
  "Ir al Carnaval de Santa Cruz de Tenerife": "cola bordada en el suelo",
  "Ir al Carnaval de Venecia": "máscara veneciana",
  "Ir al Festival de Cine de Sitges": "alfombra y focos",
  "Ir al Saint Patrick's Day de Dublín": "jarras de cerveza negra",
  "Jugar al Holi en India": "polvo de colores",
  "Mojarte en el Songkran": "agua lanzada",
  "Pasar un día en Ferrari Land": "rizo de montaña rusa",
  "Sacarte el título de buceo Open Water": "silueta bajo el agua",
  "Soltar un farolillo en el Yi Peng": "farolillos en el cielo",
  "Tirar tomates en La Tomatina": "tomates y multitud",
  "Comer arroz en el Delta del Ebro": "arroz",
  "Comer cargols a la llauna en Lleida": "caracoles",
  "Comer en el Borough Market": "quesos curados",
  "Comer en el mercado de Chatuchak": "wok humeante",
  "Comer en el mercado de La Boqueria": "zumos de colores",
  "Comer en el Mercado de San Juan": "chiles secos en montones",
  "Comer en el Mercado de San Miguel": "banderillas en platitos",
  "Comer en los puestos de Jemaa el-Fna": "cazo de caldo de caracoles",
  "Comer en un hawker centre de Singapur": "bandeja de compartimentos",
  "Comer en el mercado de Toyosu": "pescado crudo",
  "Comer en un restaurante con dos estrellas Michelin": "campana levantándose con humo",
  "Comer en un restaurante con una estrella Michelin": "salsa vertida al servir",
  "Comer gambas de Palamós": "gambas enteras en fila",
  "Probar el pulpo vivo": "marisco",
  "Comer suquet de peix en la Costa Brava": "guiso de pescado",
  "Comer un pastel de Belém": "dulce",
  "Comer una pizza napolitana en Nápoles": "pizza",
  "Comer xató en Vilanova": "ensalada",
  "Comerte un escorpión": "cola curvada con aguijón",
  "Comerte una tarántula": "patas peludas",
  "Probar las hormigas culonas": "montón de hormigas grandes",
  "Probar los saltamontes fritos": "pila de saltamontes con limón",
  "Hacer una calçotada en Valls": "calçots a la brasa",
  "Probar el balut": "huevo abierto por arriba",
  "Probar el huevo de cien años": "yema verde y clara ámbar",
  "Probar el café kopi luwak": "café",
  "Probar el casu marzu": "queso",
  "Probar el cuy": "animal pequeño entero asado",
  "Probar la carne de cocodrilo": "filetes con marcas de parrilla",
  "Probar el durián": "fruta",
  "Probar el haggis": "embutido",
  "Probar el surströmming": "pescado en conserva",
  "Tomar una cerveza en el Guinness Storehouse": "cerveza",
  "Doctorarte": "birrete",
  "Practicar CrossFit": "barra y discos",
  "Practicar escalada en roca": "calzado deportivo",
  "Practicar esquí de travesía": "esquís",
  "Practicar golf": "bola y palo",
  "Practicar hípica": "silla de montar",
  "Practicar kitesurf": "cometa",
  "Practicar paddle surf": "tabla y remo",
  "Practicar snowboard": "tabla en la nieve",
  "Practicar surf": "tabla en la arena",
  "Practicar tenis": "raqueta y pelota",
  "Practicar wakeboard": "cuerda de arrastre",
  "Practicar windsurf": "vela en la orilla",
  "Publicar un libro": "libro",
  "Sacarte el C1 de inglés": "hoja de examen",
  "Sacarte el carnet de moto": "casco",
  "Sacarte el título de patrón de embarcaciones": "timón",
  "Sacarte la licencia de piloto": "mandos de vuelo",
  "Ver una velada de boxeo por un título mundial": "guantes de boxeo",
  "Dormir en el desierto de Wadi Rum": "jaima entre arenisca roja",
  "Dormir en una jaima en el Sáhara": "jaima entre dunas",
  "Dormir en el refugio de Amitges": "botas sobre el poyo de piedra",
  "Dormir una noche en un refugio de montaña": "litera con mantas dobladas",
  "Dormir en un bungalow sobre el agua en Bora Bora": "bungalow con montaña detrás",
  "Dormir en un bungalow sobre el agua en Maldivas": "hilera de bungalows con pasarela",
  "Hacer una cata de vinos en una bodega": "bodega de barricas",
  "Pasar un día en PortAventura": "montaña rusa",
  "Practicar escalada en rocódromo": "muro de presas",
  "Bañarte en la piscina del Marina Bay Sands": "piscina infinita",
  "Caminar sobre un glaciar en Islandia": "nieve o hielo",
  "Correr la Marató de Barcelona": "avenida ancha entre vallas",
  "Dormir en una cabaña sin electricidad": "vela sobre mesa de madera",
  "Flotar en el mar Muerto": "agua densa",
  "Terminar un máster": "escalinata",
  "Ver un eclipse solar total": "cielo con eclipse",
  "Practicar escalada en hielo": "piolet",
  "Practicar motocross": "barro",
  "Practicar patinaje sobre hielo": "hielo rayado",
  "Sacarte el cinturón negro": "cinturón",
  "Saltar en paracaídas": "paracaídas",
}

/**
 * QUÉ OCUPA EL PRIMER PLANO. El tercer campo, y nació de una pareja que el
 * segundo no supo ver.
 *
 * «Ir a la Festa Major de Vilafranca» y «Ir al Carnaval de Cádiz» tienen
 * elementos distintos —«base apretada de la torre» y «coro con sombreros
 * iguales»— y salieron LA MISMA FOTO: una cabeza oscura de espaldas en primer
 * término contra una masa de gente, las dos a contraluz. Lo que compartían no
 * era el elemento: era la composición, que es otra cosa y se mira aparte.
 *
 * SOLO LO LLEVAN LOS CUATRO ENCUADRES QUE DEJAN LA COMPOSICIÓN LIBRE
 * (contraluz, primera_persona, lugar_vacio y espaldas). En los otros seis la
 * fija el propio encuadre —un plato visto a plomo, unas manos, una sola pieza
 * en primerísimo plano, un casco, un objeto solo, un torso con su objeto—, así
 * que ahí el campo no distinguiría nada: marcaría 119 parejas que son iguales
 * a propósito. Una comprobación que alarma sin motivo se deja de mirar, y eso
 * ya está pagado en este repo.
 *
 * El vocabulario es corto a posta, igual que el de ELEMENTO: si hubiera un
 * valor por foto, dos no coincidirían nunca y el campo no compararía nada.
 */
export const PRIMER_PLANO = {
  "Bailar salsa": "una o dos siluetas de persona",
  "Beber en una carpa del Oktoberfest": "una hilera que se repite",
  "Cantar en un karaoke": "un objeto suelto",
  "Correr la Ultra Pirineu": "una o dos siluetas de persona",
  "Correr un encierro de San Fermín": "un animal",
  "Correr un maratón": "una multitud de cuerpos",
  "Dar una charla ante más de cien personas": "una o dos siluetas de persona",
  "Escalar una aguja de Montserrat": "roca o pared",
  "Formar parte de un castell": "una multitud de cuerpos",
  "Ir a la Feria de Abril": "luces o haces",
  "Ir a la Festa dels Raiers": "agua",
  "Ir a la Festa Major de Gràcia": "tela o traje",
  "Ir a la Festa Major de Vilafranca": "una estructura grande y alta",
  "Ir a la Fira de Santa Llúcia": "una hilera que se repite",
  "Ir a la Nit del Foc de las Fallas": "una multitud de cuerpos",
  "Ir a la Patum de Berga": "una multitud de cuerpos",
  "Ir a unos Juegos Olímpicos": "una estructura grande y alta",
  "Ir a unos Juegos Olímpicos de invierno": "una superficie de suelo o pista",

  "Ir al Burning Man": "fuego o chispas",
  "Ir al Canet Rock": "un objeto suelto",

  "Ir al Carnaval de Río": "tela o traje",
  "Ir al Carnaval de Santa Cruz de Tenerife": "tela o traje",
  "Ir al Carnaval de Sitges": "tela o traje",
  "Ir al Carnaval de Venecia": "una cara o máscara",
  "Ir al correfoc de la Mercè": "fuego o chispas",
  "Ir al Cruïlla": "una parte del cuerpo",
  "Ir al Festival de Cine de Sitges": "una superficie de suelo o pista",
  "Ir al Glastonbury": "una hilera que se repite",

  "Ir al Sónar": "una multitud de cuerpos",
  "Jugar al Holi en India": "partículas en el aire",
  "Mojarte en el Songkran": "agua",

  "Sacarte el título de buceo Open Water": "una o dos siluetas de persona",
  "Soltar un farolillo en el Yi Peng": "partículas en el aire",
  "Tirar tomates en La Tomatina": "una multitud de cuerpos",
  "Bañarte en Cala Estreta": "roca o pared",
  "Bucear a más de 30 metros": "agua",
  "Dar una vuelta al Nürburgring": "una superficie de suelo o pista",
  "Hacer barranquismo en la Noguera": "roca o pared",
  "Hacer cumbre en un cuatromil": "cielo abierto",
  "Hacer la ferrata de Boixadera dels Bancs": "roca o pared",
  "Hacer la Travessia del Port de Barcelona nadando": "agua",
  "Hacer rafting": "agua",
  "Hacer un safari en el Masái Mara": "un animal",
  "Montar en el London Eye": "una estructura grande y alta",
  "Navegar entre los islotes de El Nido": "roca o pared",
  "Navegar por el río Li en Guilin": "terreno natural",
  "Navegar por los fiordos noruegos": "roca o pared",
  "Pilotar una avioneta": "un vehículo o embarcación",
  "Practicar esquí": "nieve o hielo",
  "Practicar vela": "un vehículo o embarcación",
  "Subir en bici al Angliru": "una superficie de suelo o pista",
  "Ver el festival de globos de Albuquerque": "cielo abierto",
  "Ver la Nochevieja en Times Square": "luces o haces",
  "Ver los fuegos de Nochevieja en Sídney": "una estructura grande y alta",
  "Ver un Gran Premio de Fórmula 1": "un vehículo o embarcación",
  "Ver un Gran Premio de MotoGP": "un vehículo o embarcación",
  "Ver un Gran Premio en Montmeló": "un vehículo o embarcación",
  "Ver un lanzamiento de un cohete": "un vehículo o embarcación",
  "Ver un partido de la NBA": "una superficie de suelo o pista",
  "Ver un partido del Mundial de fútbol": "tela o traje",
  "Ver un partido del Mundial de rugby": "una multitud de cuerpos",
  "Ver un partido del Seis Naciones": "una estructura grande y alta",
  "Ver un partido en el Arthur Ashe del US Open": "una superficie de suelo o pista",
  "Ver un partido en el Camp Nou": "una estructura grande y alta",
  "Ver un partido en el Madison Square Garden": "una estructura grande y alta",
  "Ver un partido en el Muro Amarillo de Dortmund": "una multitud de cuerpos",
  "Ver un partido en la Philippe-Chatrier de Roland Garros": "una superficie de suelo o pista",
  "Ver un partido en la pista central de Wimbledon": "una superficie de suelo o pista",
  "Ver una carrera en el circuito de Mónaco": "un vehículo o embarcación",
  "Ver una carrera en Indianápolis": "un vehículo o embarcación",
  "Ver una carrera en Monza": "una estructura grande y alta",
  "Ver una carrera en Silverstone": "un vehículo o embarcación",
  "Ver una carrera en Spa-Francorchamps": "una superficie de suelo o pista",
  "Ver una etapa de la Volta a Catalunya": "una multitud de cuerpos",
  "Ver una etapa de la Vuelta a España": "una multitud de cuerpos",
  "Ver una etapa del Giro de Italia": "una multitud de cuerpos",
  "Ver una etapa del Rally Dakar": "un vehículo o embarcación",
  "Ver una etapa del Tour de Francia": "una superficie de suelo o pista",
  "Ver una final de Grand Slam de tenis": "un objeto suelto",
  "Ver una final de la Champions League": "un objeto suelto",
  "Ver una final de la NBA": "partículas en el aire",
  "Ver una procesión de la Semana Santa de Sevilla": "una multitud de cuerpos",
  "Ver una regata de la Copa América de vela": "un vehículo o embarcación",
  "Volar en globo sobre los volcanes de la Garrotxa": "terreno natural",
  "Bajar a la montaña de sal de Cardona": "roca o pared",
  "Bajar al cráter del volcán Santa Margarida": "terreno natural",
  "Bañarte en Bondi Beach": "un objeto suelto",
  "Bañarte en la playa de Copacabana": "una superficie de suelo o pista",
  "Bañarte en las terrazas de Pamukkale": "terreno natural",
  "Bañarte en los Baños Széchenyi": "agua",
  "Bañarte en Santa Monica": "una pasarela o un puente",
  "Bucear en Raja Ampat": "agua",
  "Dormir en el desierto de Wadi Rum": "una construcción pequeña y aislada",

  "Dormir en un bungalow sobre el agua en Bora Bora": "una construcción pequeña y aislada",
  "Dormir en un bungalow sobre el agua en Maldivas": "una hilera que se repite",
  "Dormir en una jaima en el Sáhara": "una construcción pequeña y aislada",
  "Dormir una noche en un refugio de montaña": "un objeto suelto",
  "Hacer cumbre en el Kilimanjaro": "nieve o hielo",
  "Hacer el Camí dels Bons Homes": "un camino o sendero",
  "Hacer la ferrata de Les Baumes": "una pasarela o un puente",
  "Hacer la ferrata del Salt del Grill": "roca o pared",
  "Hacer la Matagalls-Montserrat": "un camino o sendero",
  "Hacer la ruta de las nueve ermitas del Montsant": "una fachada o una escalinata",
  "Hacer la Vía Verde del Carrilet de Olot a Girona": "una fachada o una escalinata",

  "Hacer una cata de vinos en una bodega": "un interior cerrado",
  "Hacer una travesía de varios días en montaña": "un objeto suelto",
  "Jugar en el Old Course de St Andrews": "terreno natural",
  "Llegar al Cabo de Buena Esperanza": "roca o pared",
  "Llegar al campo base del Everest": "tela o traje",
  "Montar en el tranvía 28 de Lisboa": "un interior cerrado",
  "Nadar en aguas abiertas una travesía": "agua",
  "Navegar por el delta del Ebro": "un vehículo o embarcación",
  "Pasar un día en PortAventura": "una estructura grande y alta",
  "Perderte en los zocos de Marrakech": "un objeto suelto",
  "Pisar la Antártida": "nieve o hielo",
  "Practicar escalada en rocódromo": "una estructura grande y alta",
  "Recorrer el carril bici más largo del mundo": "un camino o sendero",
  "Salir por el Temple Bar": "un interior cerrado",
  "Saltar en puenting en Queenstown": "una pasarela o un puente",
  "Subir en bici al Alpe d'Huez": "un camino o sendero",
  "Subir en bici al Port del Cantó": "una hilera que se repite",
  "Terminar un triatlón olímpico": "una hilera que se repite",
  "Bañarte en la piscina del Marina Bay Sands": "agua",
  "Caminar sobre un glaciar en Islandia": "nieve o hielo",
  "Correr la Cursa dels Bombers": "una multitud de cuerpos",
  "Correr la Marató de Barcelona": "una superficie de suelo o pista",
  "Correr la Mitja de Granollers": "una fachada o una escalinata",
  "Correr un 10K": "una superficie de suelo o pista",
  "Correr un ultratrail": "un camino o sendero",
  "Dormir en una cabaña sin electricidad": "un interior cerrado",
  "Flotar en el mar Muerto": "agua",
  "Terminar un máster": "una fachada o una escalinata",
  "Ver un eclipse solar total": "cielo abierto",
  "Vivir un año en otro país": "una fachada o una escalinata",
  "Mudarte a otro continente": "un interior cerrado",
}

/**
 * CUÁNTOS HAY EN CADA MAPA, DECLARADO A MANO.
 *
 * Esto no es documentación: es un cable trampa, y lo comprueba `reparto.mjs`.
 *
 * El 10-10-2026 un guion escribió 97 cámaras DENTRO de NO_SABE_HACERLO —el
 * mapa de «el modelo no sabe dibujar esto»— porque acotó el bloque hasta el
 * export equivocado. No falló nada. Dejó 97 gooals marcados como imposibles y
 * mandados a Commons, y lo único que lo delató fue que un número impreso pasó
 * de 259 a 162 y por suerte alguien lo estaba mirando.
 *
 * Un número que hay que leer no es una comprobación: es una nota. Estos sí lo
 * son, porque una escritura en el mapa que no toca mueve DOS cuentas a la vez
 * y el guion para.
 *
 * Al añadir algo a propósito, se sube el número de aquí. Es el único sitio.
 */
export const CUANTOS = {
  DECIDIDOS: 222,
  CAMARA: 260,
  ELEMENTO: 259,
  PRIMER_PLANO: 135,
  NO_SABE_HACERLO: 2,
  APROBADAS: 18,
}

/**
 * DOS CLASES DE RENDICIÓN, Y LA SEGUNDA SE VE SIN GASTAR NADA.
 *
 * · EL MODELO NO SABE HACERLO (el pádel): no dibuja una pala reconocible,
 *   la pongas donde la pongas. Esto SOLO se descubre probando, y el umbral
 *   está en dos encuadres distintos.
 *
 * · NO PODEMOS HACERLO NOSOTROS (Cádiz): el gooal se reconoce por caras de
 *   gente disfrazada o por un desfile, y las caras las prohíben nuestras
 *   propias reglas. Esto NO hay que descubrirlo probando: SE VE LEYENDO EL
 *   TÍTULO. Gastar intentos en uno de estos es gastarlos en algo que ya
 *   sabíamos imposible.
 *
 * La segunda clase predice, y por eso vale la pena mirarla antes de cada
 * tanda: dos minutos de lectura ahorran nueve imágenes.
 *
 * Y QUIÉN está en NO_SABE_HACERLO, por su nombre. Es una lista corta y a mano
 * a propósito: entrar aquí significa renunciar a generarle foto, así que no
 * puede pasar por descuido ni por un guion.
 */
export const RENDIDOS = ['Practicar pádel', 'Ir al Carnaval de Cádiz']
