#!/usr/bin/env node
/**
 * GooALS — siembra del catálogo gooals_v2 desde gooals.json.
 *
 *   node scripts/seed-gooals/insertar.mjs            # inserta todo
 *   node scripts/seed-gooals/insertar.mjs naturaleza # solo una categoría
 *   node scripts/seed-gooals/insertar.mjs --dry-run  # no escribe, solo cuenta
 *
 *   node scripts/seed-gooals/insertar.mjs --coordenadas  # solo sube lat/lng
 *   node scripts/seed-gooals/insertar.mjs --traer-coordenadas  # las baja al fichero
 *
 * Idempotente: antes de insertar se trae los títulos que ya están en la tabla
 * y solo manda los que faltan. Relanzarlo no duplica nada.
 *
 * Las categorías son las seis de la app (las claves de gooals.json). Si alguna
 * no lo es, se para antes de tocar nada: la base la rechazaría a mitad de lote.
 *
 * Requiere Node 18+ (usa fetch nativo) y SUPABASE_SERVICE_ROLE_KEY en .env.local.
 * Script local de siembra: no forma parte de la app y no se despliega.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');

// ── Credenciales desde .env.local ───────────────────────────────────
const env = Object.fromEntries(
  readFileSync(join(raiz, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const cabeceras = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

// ── Argumentos ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const soloCategoria = args.find((a) => !a.startsWith('-'));

// Copia de CATEGORIAS en src/lib/gooals.ts (este script no puede importar
// TypeScript). La base solo acepta estas: gooals_v2_categoria_valida.
const CATEGORIAS = ['viajes', 'naturaleza', 'eventos', 'deporte', 'gastronomia', 'vida'];

const catalogo = JSON.parse(readFileSync(join(aqui, 'gooals.json'), 'utf8'));
const categorias = soloCategoria ? [soloCategoria] : Object.keys(catalogo);
for (const c of categorias) {
  if (!catalogo[c]) {
    console.error(`Categoría desconocida: ${c}. Hay: ${Object.keys(catalogo).join(', ')}`);
    process.exit(1);
  }
}
// Un gooals.json de antes del reparto en seis categorías trae "aventura" o
// "cultura": mejor pararlo aquí que a mitad de un lote de 500.
const invalidas = Object.keys(catalogo).filter((c) => !CATEGORIAS.includes(c));
if (invalidas.length > 0) {
  console.error(`gooals.json trae categorías que la base no acepta: ${invalidas.join(', ')}.`);
  console.error(`Son: ${CATEGORIAS.join(', ')}. Regenéralo con generar_sql.py.`);
  process.exit(1);
}

// ── Helpers REST ────────────────────────────────────────────────────
async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: { ...cabeceras, ...(opciones.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${await res.text()}`);
  }
  return res;
}

/**
 * Títulos que ya están en la tabla, en CUALQUIER categoría (paginado de 1000).
 *
 * En cualquiera y no solo en la suya: si en el panel se le cambia la categoría a
 * un gooal (lo normal al repasar las dudosas), buscar solo en la del fichero lo
 * daría por nuevo y lo volvería a meter duplicado.
 */
let titulosEnTabla = null;
async function titulosExistentes() {
  if (titulosEnTabla) return titulosEnTabla;
  const vistos = new Set();
  for (let desde = 0; ; desde += 1000) {
    const res = await pedir(
      // Orden por id: sin un orden fijo, las páginas pueden solaparse y saltarse filas.
      'gooals_v2?select=titulo&order=id',
      { headers: { Range: `${desde}-${desde + 999}` } },
    );
    const filas = await res.json();
    for (const f of filas) vistos.add(f.titulo);
    if (filas.length < 1000) break;
  }
  titulosEnTabla = vistos;
  return vistos;
}

const LOTE = 500;

/**
 * Si un gooal va al mapa ('lugar') o no necesita coordenadas nunca ('personal').
 * Copia de ambitoDeGooal() en src/lib/gooals.ts (este script no puede importar
 * TypeScript). Si cambia allí, cambia aquí y en generar_sql.py.
 */
function ambitoDe(f) {
  if (f.lat != null) return 'lugar';
  if (f.ciudad) return 'lugar';
  if (f.pais && (f.categoria === 'viajes' || f.categoria === 'naturaleza')) return 'lugar';
  return 'personal';
}

async function sembrar(categoria) {
  const filas = catalogo[categoria];
  const yaEstan = await titulosExistentes();
  const nuevas = filas.filter((f) => !yaEstan.has(f.titulo));

  const saltadas = filas.length - nuevas.length;
  if (nuevas.length === 0) {
    console.log(`  ${categoria.padEnd(12)} 0 nuevas (${saltadas} ya estaban)`);
    return 0;
  }
  if (dryRun) {
    console.log(`  ${categoria.padEnd(12)} ${nuevas.length} se insertarían (${saltadas} ya estaban)`);
    return 0;
  }

  let hechas = 0;
  for (let i = 0; i < nuevas.length; i += LOTE) {
    const lote = nuevas.slice(i, i + LOTE).map((f) => ({
      titulo: f.titulo,
      descripcion: f.descripcion,
      categoria: f.categoria,
      // Lo marca reparto_categorias.txt: la regla no tenía clara la categoría.
      categoria_dudosa: f.categoria_dudosa ?? false,
      // Sin dificultad: la calcula la base a partir de los puntos (fase3f.sql).
      // En gooals.json sigue existiendo, pero solo como dato de trabajo del PDF.
      puntos: f.puntos,
      ciudad: f.ciudad,
      pais: f.pais,
      // Las pone geocodificar.mjs. Nulas en todo lo deslocalizado.
      lat: f.lat ?? null,
      lng: f.lng ?? null,
      geo: f.geo ?? null,
      activo: true,
      // Todo lo que siembra el pipeline nace en borrador: se publica al
      // verificarlo en el panel, no por haberlo sacado de un PDF.
      estado: 'borrador',
      ambito: ambitoDe(f),
    }));
    await pedir('gooals_v2', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(lote),
    });
    hechas += lote.length;
    process.stdout.write(`\r  ${categoria.padEnd(12)} ${hechas}/${nuevas.length}`);
  }
  console.log(`\r  ${categoria.padEnd(12)} ${hechas} insertadas (${saltadas} ya estaban)`);
  return hechas;
}

// ── Coordenadas para las filas que ya estaban ───────────────────────
// insertar() solo añade filas nuevas, así que los 4.452 gooals que ya estaban
// en Supabase antes de geocodificar se quedarían sin coordenadas para siempre.
// Esto los repasa y les pone las suyas.
//
// Va de una en una porque cada fila tiene un lat/lng distinto y PostgREST no
// sabe hacer un update con valores diferentes por fila. Con TANDA en paralelo
// son un par de minutos para todo el catálogo.
const TANDA = 10;

async function actualizarCoordenadas(categoria) {
  const porTitulo = new Map(
    catalogo[categoria].filter((f) => f.lat != null).map((f) => [f.titulo, f]),
  );
  if (porTitulo.size === 0) {
    console.log(`  ${categoria.padEnd(12)} sin coordenadas que subir`);
    return 0;
  }

  // Solo las filas a las que les falta algo: relanzarlo no reescribe lo ya puesto.
  const pendientes = [];
  for (let desde = 0; ; desde += 1000) {
    const res = await pedir(
      `gooals_v2?select=id,titulo,lat&categoria=eq.${encodeURIComponent(categoria)}`,
      { headers: { Range: `${desde}-${desde + 999}` } },
    );
    const filas = await res.json();
    for (const f of filas) {
      const fuente = porTitulo.get(f.titulo);
      if (fuente && f.lat == null) pendientes.push({ id: f.id, fuente });
    }
    if (filas.length < 1000) break;
  }

  if (pendientes.length === 0) {
    console.log(`  ${categoria.padEnd(12)} 0 por actualizar (ya las tienen)`);
    return 0;
  }
  if (dryRun) {
    console.log(`  ${categoria.padEnd(12)} ${pendientes.length} recibirían coordenadas`);
    return 0;
  }

  let hechas = 0;
  for (let i = 0; i < pendientes.length; i += TANDA) {
    await Promise.all(
      pendientes.slice(i, i + TANDA).map(({ id, fuente }) =>
        pedir(`gooals_v2?id=eq.${id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          // ambito: 'lugar' va con las coordenadas a la fuerza. La base rechaza
          // un gooal 'personal' con pin (gooals_v2_personal_sin_coordenadas), y
          // si tiene pin es que es un sitio.
          body: JSON.stringify({
            lat: fuente.lat, lng: fuente.lng, geo: fuente.geo ?? null, ambito: 'lugar',
          }),
        }),
      ),
    );
    hechas += Math.min(TANDA, pendientes.length - i);
    process.stdout.write(`\r  ${categoria.padEnd(12)} ${hechas}/${pendientes.length}`);
  }
  console.log(`\r  ${categoria.padEnd(12)} ${hechas} con coordenadas nuevas    `);
  return hechas;
}

// ── Traer las coordenadas de la tabla al fichero ────────────────────
// El inverso de actualizarCoordenadas(): en vez de subir, baja.
//
// Existe porque el fichero y la tabla se desincronizan cada vez que cambiamos
// un título. El enlace entre los dos es (categoria, titulo), así que al
// renombrar se rompe: en Supabase el título se cambia con un UPDATE y la fila
// conserva sus coordenadas, pero en gooals.json la fila se regenera desde el
// PDF y nace sin lat. El pin sigue existiendo, solo que el fichero ya no sabe
// cuál es el suyo.
//
// La alternativa sería volver a pasar geocodificar.mjs, pero eso es una
// consulta a Nominatim por cada sitio (una por segundo, minutos de espera)
// para recuperar un dato que ya está en nuestra propia base — y encima el
// geocodificador puede devolver un pin distinto del que ya está publicado.
// Copiarlo de la tabla es inmediato y da exactamente lo que ven los usuarios.
async function traerCoordenadas(categoria) {
  const sinPin = catalogo[categoria].filter((f) => f.lat == null);
  if (sinPin.length === 0) {
    console.log(`  ${categoria.padEnd(12)} el fichero ya las tiene todas`);
    return 0;
  }

  // Paginar no es opcional: PostgREST devuelve como mucho 1.000 filas y no
  // avisa de que hay más, así que las categorías grandes volverían a medias.
  const enTabla = new Map();
  for (let desde = 0; ; desde += 1000) {
    const res = await pedir(
      `gooals_v2?select=titulo,lat,lng,geo&categoria=eq.${encodeURIComponent(categoria)}`,
      { headers: { Range: `${desde}-${desde + 999}` } },
    );
    const filas = await res.json();
    for (const f of filas) enTabla.set(f.titulo, f);
    if (filas.length < 1000) break;
  }

  let traidas = 0;
  for (const f of sinPin) {
    const fila = enTabla.get(f.titulo);
    // Sin fila (el título cambió en el fichero) o sin pin en la tabla no hay
    // nada que copiar: esas son las que hay que geocodificar de verdad.
    if (!fila || fila.lat == null) continue;
    if (!dryRun) {
      f.lat = fila.lat;
      f.lng = fila.lng;
      f.geo = fila.geo ?? null;
    }
    traidas++;
  }

  const quedan = sinPin.length - traidas;
  console.log(
    `  ${categoria.padEnd(12)} ${traidas} ${dryRun ? 'se traerían' : 'traídas'} · ${quedan} siguen sin pin`,
  );
  return traidas;
}

// ── Main ────────────────────────────────────────────────────────────
if (args.includes('--traer-coordenadas')) {
  console.log(dryRun ? 'Simulación (no escribe nada):' : 'Trayendo coordenadas de gooals_v2 al fichero:');
  let n = 0;
  for (const c of categorias) n += await traerCoordenadas(c);

  if (!dryRun && n > 0) {
    // Mismo formato compacto que escribe geocodificar.mjs: guardado indentado,
    // tocar una sola coordenada dejaría un diff de miles de líneas.
    writeFileSync(join(aqui, 'gooals.json'), JSON.stringify(catalogo, null, 0), 'utf8');
  }

  // Las que siguen sin pin son las que no están en la tabla o tampoco lo
  // tienen allí: esas solo las arregla el geocodificador.
  const todas = Object.values(catalogo).flat();
  const conPin = todas.filter((f) => f.lat != null).length;
  console.log(
    `
${n} coordenadas ${dryRun ? 'por traer' : 'traídas'}. ` +
      `El fichero tiene ${conPin} con pin y ${todas.length - conPin} sin él.`,
  );
  process.exit(0);
}

if (args.includes('--coordenadas')) {
  console.log(dryRun ? 'Simulación de coordenadas:' : 'Subiendo coordenadas a gooals_v2:');
  let n = 0;
  for (const c of categorias) n += await actualizarCoordenadas(c);
  console.log(`\n${n} gooals actualizados.`);
  process.exit(0);
}

console.log(dryRun ? 'Simulación (no escribe nada):' : 'Insertando en gooals_v2:');
let total = 0;
for (const c of categorias) total += await sembrar(c);

if (!dryRun) {
  const res = await pedir('gooals_v2?select=id', {
    method: 'HEAD',
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  console.log(`\n${total} insertadas. gooals_v2 tiene ahora ${
    (res.headers.get('content-range') || '/?').split('/')[1]
  } filas.`);
}
