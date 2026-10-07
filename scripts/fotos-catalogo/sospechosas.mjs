// Fotos del catálogo cuyo NOMBRE DE FICHERO nombra un país distinto del que
// dice el gooal. Sale de encontrar, por casualidad, que "Bañarte en la Laguna
// Azul" (Reikiavik, Islandia) llevaba LAGUNA_AZUL_ARGENTINA.jpg.
//
// NO ARREGLA NADA. Escribe una lista para que la mire una persona.
//
// La tabla de países se contrasta contra TODOS los datos antes de usarla: si
// algún país del catálogo no estuviera en ella, el informe diría que todo está
// comprobado cuando a esas filas no se les habría mirado nada. Es la lección
// más cara de este repo y aquí aplica entera.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/**
 * Cómo puede aparecer cada país en el nombre de un fichero de Commons: en
 * español, en inglés y en su propio idioma. La clave es el nombre tal cual lo
 * guarda `gooals_v2.pais`.
 */
const PAISES = {
  'España': ['espana', 'spain', 'spanish'],
  'Estados Unidos': ['united states', 'usa', 'u s a'],
  'Italia': ['italia', 'italy', 'italian'],
  'China': ['china', 'chinese'],
  'Alemania': ['alemania', 'germany', 'deutschland', 'german'],
  'Francia': ['francia', 'france', 'french'],
  'Reino Unido': ['united kingdom', 'england', 'scotland', 'wales', 'britain', 'british'],
  'Japón': ['japon', 'japan', 'japanese', 'nippon'],
  'India': ['india', 'indian'],
  'Portugal': ['portugal', 'portuguese'],
  'Egipto': ['egipto', 'egypt', 'egyptian'],
  'Tailandia': ['tailandia', 'thailand', 'thai'],
  'México': ['mexico', 'mexican'],
  'República Checa': ['czech', 'czechia', 'chequia'],
  'Indonesia': ['indonesia', 'indonesian'],
  'Brasil': ['brasil', 'brazil', 'brazilian'],
  'Irlanda': ['irlanda', 'ireland', 'irish', 'eire'],
  'Países Bajos': ['netherlands', 'holland', 'nederland', 'dutch'],
  'Rusia': ['rusia', 'russia', 'russian'],
  'Canadá': ['canada', 'canadian'],
  'Turquía': ['turquia', 'turkey', 'turkiye', 'turkish'],
  'Nepal': ['nepal', 'nepalese'],
  'Marruecos': ['marruecos', 'morocco', 'maroc', 'moroccan'],
  'Bélgica': ['belgica', 'belgium', 'belgique', 'belgian'],
  'Argentina': ['argentina', 'argentine', 'argentinian'],
  'Sudáfrica': ['south africa', 'sudafrica'],
  'Perú': ['peru', 'peruvian'],
  'Australia': ['australia', 'australian'],
  'Austria': ['austria', 'osterreich', 'austrian'],
  'Noruega': ['noruega', 'norway', 'norge', 'norwegian'],
  // 'island' NO está en la lista: es una palabra inglesa corriente y marcaba
  // Alcatraz Island como si fuera de Islandia. Una forma que genera ruido a
  // propósito gasta la atención de quien revisa en filas que están bien.
  'Islandia': ['islandia', 'iceland', 'icelandic'],
  'Emiratos Árabes Unidos': ['emirates', 'emiratos', 'uae'],
  'Corea del Sur': ['south korea', 'korea', 'corea', 'korean'],
  'Nueva Zelanda': ['new zealand', 'nueva zelanda'],
  'Hungría': ['hungria', 'hungary', 'magyar', 'hungarian'],
  'Dinamarca': ['dinamarca', 'denmark', 'danmark', 'danish'],
  'Tanzania': ['tanzania', 'tanzanian'],
  'Israel': ['israel', 'israeli'],
  'Chile': ['chile', 'chilean'],
  'Groenlandia': ['groenlandia', 'greenland', 'kalaallit'],
  'Catar': ['catar', 'qatar', 'qatari'],
  'Namibia': ['namibia', 'namibian'],
  'Botsuana': ['botsuana', 'botswana'],
  'Kenia': ['kenia', 'kenya', 'kenyan'],
  'Suiza': ['suiza', 'switzerland', 'schweiz', 'suisse', 'swiss'],
  'Singapur': ['singapur', 'singapore'],
  'Croacia': ['croacia', 'croatia', 'hrvatska', 'croatian'],
  'Antártida': ['antartida', 'antarctica', 'antarctic'],
  'Birmania': ['birmania', 'burma', 'myanmar', 'burmese'],
  'Jordania': ['jordania', 'jordan', 'jordanian'],
  'Camboya': ['camboya', 'cambodia', 'cambodian'],
  'Grecia': ['grecia', 'greece', 'greek', 'hellas'],
  'Suecia': ['suecia', 'sweden', 'sverige', 'swedish'],
}

/**
 * Países que NO están en el catálogo pero que pueden salir en un nombre de
 * fichero. Sin ellos, una foto de Vietnam puesta en un gooal de Tailandia
 * pasaría sin que nadie la mirara: la tabla tiene que poder reconocer al
 * intruso, no solo a los de casa.
 */
const OTROS = {
  'Vietnam': ['vietnam', 'viet nam'], 'Colombia': ['colombia'], 'Cuba': ['cuba'],
  'Bolivia': ['bolivia'], 'Ecuador': ['ecuador'], 'Uruguay': ['uruguay'],
  'Venezuela': ['venezuela'], 'Costa Rica': ['costa rica'], 'Panamá': ['panama'],
  'Guatemala': ['guatemala'], 'Filipinas': ['filipinas', 'philippines'],
  'Malasia': ['malasia', 'malaysia'], 'Pakistán': ['pakistan'], 'Irán': ['iran'],
  'Irak': ['irak', 'iraq'], 'Arabia Saudí': ['arabia saudi', 'saudi arabia'],
  'Polonia': ['polonia', 'poland', 'polska'], 'Rumanía': ['rumania', 'romania'],
  'Bulgaria': ['bulgaria'], 'Serbia': ['serbia'], 'Eslovenia': ['eslovenia', 'slovenia'],
  'Eslovaquia': ['eslovaquia', 'slovakia'], 'Ucrania': ['ucrania', 'ukraine'],
  'Finlandia': ['finlandia', 'finland', 'suomi'], 'Estonia': ['estonia'],
  'Letonia': ['letonia', 'latvia'], 'Lituania': ['lituania', 'lithuania'],
  'Etiopía': ['etiopia', 'ethiopia'], 'Nigeria': ['nigeria'], 'Ghana': ['ghana'],
  'Senegal': ['senegal'], 'Túnez': ['tunez', 'tunisia'], 'Argelia': ['argelia', 'algeria'],
  'Libia': ['libia', 'libya'], 'Zimbabue': ['zimbabue', 'zimbabwe'], 'Zambia': ['zambia'],
  'Uganda': ['uganda'], 'Madagascar': ['madagascar'], 'Mongolia': ['mongolia'],
  'Bangladés': ['bangladesh'], 'Sri Lanka': ['sri lanka'], 'Laos': ['laos'],
  'Taiwán': ['taiwan'], 'Luxemburgo': ['luxemburgo', 'luxembourg'],
  'Malta': ['malta'], 'Chipre': ['chipre', 'cyprus'], 'Albania': ['albania'],
  'Bosnia': ['bosnia'], 'Montenegro': ['montenegro'], 'Georgia': ['georgia'],
  'Armenia': ['armenia'], 'Kazajistán': ['kazajistan', 'kazakhstan'],
  'Cachemira': ['kashmir'], 'Tíbet': ['tibet'],
}

const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '')
const limpiar = t => sinAcentos(decodeURIComponent(t)).replace(/[_\-.,()]/g, ' ').replace(/\s+/g, ' ').toLowerCase()

const TODOS = { ...PAISES, ...OTROS }

const { data, error } = await s.from('gooals_v2')
  .select('id, titulo, ciudad, pais, imagen_url, foto_origen, foto_autor, foto_licencia')
  .not('imagen_url', 'is', null).not('foto_origen', 'is', null)
  .order('titulo')
if (error) throw new Error(error.message)

// ── La tabla, contrastada contra TODOS los datos ──
const delCatalogo = [...new Set(data.map(g => g.pais).filter(Boolean))]
const faltan = delCatalogo.filter(p => !PAISES[p])
console.log('filas con foto:', data.length, '· países distintos en ellas:', delCatalogo.length)
if (faltan.length) {
  console.error('\nPARA: hay países del catálogo que no están en la tabla, así que a sus filas')
  console.error('no se les comprobaría nada y el informe diría que todo está mirado:')
  console.error(' ', faltan.join(' · '))
  process.exit(1)
}
console.log('la tabla cubre los', delCatalogo.length, 'países del catálogo · reconoce', Object.keys(TODOS).length, 'en total\n')

const sinPais = data.filter(g => !g.pais)
const sospechosas = []
for (const g of data) {
  if (!g.pais) continue
  const fichero = decodeURIComponent((g.foto_origen.split('File:')[1] ?? '').trim())
  const texto = ' ' + limpiar(fichero) + ' '
  const encontrados = []
  for (const [pais, formas] of Object.entries(TODOS)) {
    for (const forma of formas) {
      if (new RegExp(`\\b${forma.replace(/ /g, '\\s')}\\b`).test(texto)) { encontrados.push(pais); break }
    }
  }
  const otros = [...new Set(encontrados)].filter(p => p !== g.pais)
  if (otros.length) sospechosas.push({ ...g, fichero, dice: otros })
}

console.log('SOSPECHOSAS:', sospechosas.length)
for (const g of sospechosas) console.log(` · ${g.titulo}  [${g.ciudad ?? '—'}, ${g.pais}]  ->  ${g.fichero}  (suena a ${g.dice.join(', ')})`)
if (sinPais.length) console.log('\nsin país, no se les puede comprobar:', sinPais.length)

// ── La lista, en un fichero ──
const hoy = new Date().toISOString().slice(0, 10)
const lineas = [
  '# Fotos del catálogo que suenan a otro país',
  '',
  `Generada el ${hoy}. **Es una lista para mirar a ojo, no un diagnóstico.**`,
  '',
  'Cruza el nombre del fichero de Commons con el país que dice el gooal. Si el',
  'nombre menciona un país distinto, la fila sale aquí. Nació de encontrar por',
  'casualidad que «Bañarte en la Laguna Azul» (Reikiavik, Islandia) llevaba una',
  'foto llamada `LAGUNA_AZUL_ARGENTINA.jpg`: hay dos Lagunas Azules.',
  '',
  '## Lo que esta lista NO dice',
  '',
  '- **No dice que la foto esté mal.** Un nombre puede mencionar otro país por mil',
  '  razones (el autor, un museo con nombre extranjero, una comparación). Decide',
  '  una persona, como con los pines.',
  '- **No dice que las demás estén bien.** La mayoría de los nombres de Commons no',
  `  mencionan ningún país: de las ${data.length} con foto, solo unas pocas dan pie a este`,
  '  cruce. Que una fila no salga aquí no significa que se haya comprobado.',
  '',
  `La tabla de países cubre los **${delCatalogo.length}** que hay en el catálogo y reconoce`,
  `**${Object.keys(TODOS).length}** en total, para que una foto de un país que no está en el catálogo`,
  'también pueda detectarse. Si algún día un país del catálogo no estuviera en la',
  'tabla, el guion se para y lo dice en vez de dar por buenas esas filas.',
  '',
  `## ${sospechosas.length} sospechosas`,
  '',
  '| Gooal | Dice que está en | El fichero suena a | Fichero |',
  '|---|---|---|---|',
  ...sospechosas.map(g =>
    `| ${g.titulo} | ${[g.ciudad, g.pais].filter(Boolean).join(', ')} | **${g.dice.join(', ')}** | [${g.fichero}](${g.foto_origen}) |`),
  '',
  '## Cómo se vuelve a sacar',
  '',
  '```bash',
  'node --env-file=.env.local scripts/fotos-catalogo/sospechosas.mjs',
  '```',
  '',
]
writeFileSync('Claude outputs/fotos-sospechosas.md', lineas.join('\n'), 'utf8')
console.log('\nescrito: Claude outputs/fotos-sospechosas.md')
