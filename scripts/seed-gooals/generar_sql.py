#!/usr/bin/env python3
"""Convierte un PDF de gooals en un SQL listo para pegar en Supabase.

    python generar_sql.py pdfs/viajes.pdf viajes

Lee el PDF, saca un gooal por línea, le asigna dificultad y puntos, y escribe
output/<categoria>.sql. No toca la base de datos: solo genera el fichero.

Formato esperado del PDF (ver README.md):

    FÁCIL                      <- cabecera opcional: fija la dificultad
    Ver amanecer en la playa      de las líneas siguientes
    Bañarse en un lago de montaña | dificil | Agua helada y silencio

Cada línea puede llevar campos separados por "|": el primero es el título, y
de los demás, el que sea una dificultad manda, y el resto es la descripción.
"""

import argparse
import re
import sys
import unicodedata
from pathlib import Path

# ── Reglas del catálogo ──────────────────────────────────────────
# Mismo baremo que src/lib/gooals.ts. Si cambia allí, cambia aquí.
PUNTOS = {'facil': 1, 'dificil': 5, 'epico': 10}

CATEGORIAS = ['viajes', 'deporte', 'aventura', 'gastronomia', 'cultura', 'musica']

# Sin cabecera ni marca explícita, un gooal es "facil": es el valor que menos
# desequilibra el catálogo si el PDF viene sin clasificar.
DIFICULTAD_POR_DEFECTO = 'facil'

# ── Geografía, solo para la categoría "viajes" ───────────────────
# viajes: facil = Europa, epico = Oceanía / destinos remotos, dificil = resto.
EUROPA = {
    'espana', 'portugal', 'francia', 'italia', 'alemania', 'reino unido',
    'inglaterra', 'escocia', 'irlanda', 'holanda', 'paises bajos', 'belgica',
    'suiza', 'austria', 'grecia', 'croacia', 'noruega', 'suecia', 'finlandia',
    'dinamarca', 'islandia', 'polonia', 'chequia', 'republica checa', 'hungria',
    'rumania', 'bulgaria', 'eslovenia', 'eslovaquia', 'estonia', 'letonia',
    'lituania', 'malta', 'chipre', 'albania', 'serbia', 'montenegro', 'bosnia',
    'lisboa', 'oporto', 'paris', 'marsella', 'niza', 'burdeos', 'lyon',
    'roma', 'milan', 'venecia', 'florencia', 'napoles', 'sicilia', 'cerdena',
    'londres', 'edimburgo', 'dublin', 'amsterdam', 'bruselas', 'brujas',
    'berlin', 'munich', 'hamburgo', 'viena', 'praga', 'budapest', 'cracovia',
    'varsovia', 'atenas', 'santorini', 'mikonos', 'creta', 'dubrovnik',
    'zurich', 'ginebra', 'estocolmo', 'oslo', 'copenhague', 'helsinki',
    'reikiavik', 'tallin', 'riga', 'vilna', 'bucarest', 'sofia', 'belgrado',
    'madrid', 'barcelona', 'sevilla', 'valencia', 'bilbao', 'granada',
    'mallorca', 'menorca', 'ibiza', 'tenerife', 'canarias', 'asturias',
    'galicia', 'pirineos', 'alpes', 'toscana', 'provenza', 'algarve',
}

OCEANIA_REMOTO = {
    'oceania', 'australia', 'sidney', 'sydney', 'melbourne', 'brisbane',
    'perth', 'tasmania', 'nueva zelanda', 'auckland', 'queenstown',
    'fiji', 'fiyi', 'samoa', 'tonga', 'vanuatu', 'papua', 'nueva guinea',
    'polinesia', 'tahiti', 'bora bora', 'islas cook', 'nueva caledonia',
    'micronesia', 'palaos', 'palau', 'kiribati', 'islas salomon',
    'antartida', 'polo sur', 'polo norte', 'artico', 'groenlandia',
    'svalbard', 'isla de pascua', 'galapagos', 'patagonia', 'ushuaia',
    'kamchatka', 'mongolia', 'bhutan', 'butan', 'nepal', 'everest',
    'himalaya', 'madagascar', 'seychelles', 'kilimanjaro', 'namibia',
}

# ── Parseo del PDF ───────────────────────────────────────────────
# Viñetas y numeraciones al principio de línea: "- ", "• ", "1. ", "1) ".
PREFIJO_LISTA = re.compile(r'^\s*(?:[-*•·–—]|\d+[.)])\s+')

# Cabecera de sección: solo la palabra de dificultad, con o sin emoji o puntos
# ("⚡ FÁCIL", "DIFÍCIL — 5 pts"). Nada más en la línea.
CABECERA = re.compile(
    r'^[\W\d_]*(facil|dificil|epico)(?:\s*[—–\-:]?\s*\d+\s*p\w*)?[\W\d_]*$'
)

# Líneas de relleno del PDF que no son gooals.
RUIDO = re.compile(r'^\s*(?:\d+|p[áa]g(?:ina)?\.?\s*\d+|[-_=•·—–\s]+)\s*$', re.I)

LONGITUD_MINIMA_TITULO = 4
LONGITUD_MAXIMA_TITULO = 200


def sin_acentos(texto: str) -> str:
    """Minúsculas y sin tildes, para comparar contra las listas de arriba."""
    normalizado = unicodedata.normalize('NFD', texto.lower())
    return ''.join(c for c in normalizado if unicodedata.category(c) != 'Mn')


def extraer_texto(ruta_pdf: Path) -> str:
    """Texto plano del PDF. Requiere pypdf (o el viejo PyPDF2)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader  # type: ignore
        except ImportError:
            sys.exit(
                'Falta la librería para leer PDFs.\n'
                '  pip install pypdf'
            )

    lector = PdfReader(str(ruta_pdf))
    return '\n'.join((pagina.extract_text() or '') for pagina in lector.pages)


def clasificar_viaje(titulo: str) -> str:
    """Dificultad de un gooal de viajes según el destino que menciona.

    Europa sale barato desde España; Oceanía y los destinos remotos son el
    viaje de una vida. Todo lo demás queda en medio.
    """
    plano = sin_acentos(titulo)
    if any(lugar in plano for lugar in OCEANIA_REMOTO):
        return 'epico'
    if any(lugar in plano for lugar in EUROPA):
        return 'facil'
    return 'dificil'


def parsear_linea(linea: str) -> tuple[str, str | None, str | None] | None:
    """Devuelve (titulo, dificultad, descripcion) o None si la línea es ruido."""
    limpia = PREFIJO_LISTA.sub('', linea.strip())
    if not limpia or RUIDO.match(limpia):
        return None

    campos = [c.strip() for c in limpia.split('|') if c.strip()]
    if not campos:
        return None

    titulo = campos[0]
    dificultad = None
    descripcion = None

    for campo in campos[1:]:
        clave = sin_acentos(campo)
        if clave in PUNTOS and dificultad is None:
            dificultad = clave
        elif descripcion is None:
            descripcion = campo

    if len(titulo) < LONGITUD_MINIMA_TITULO:
        return None

    return titulo[:LONGITUD_MAXIMA_TITULO], dificultad, descripcion


def parsear(texto: str, categoria: str) -> list[dict]:
    """Convierte el texto del PDF en gooals, resolviendo dificultad y puntos."""
    gooals: list[dict] = []
    vistos: set[str] = set()
    dificultad_seccion: str | None = None

    for linea in texto.splitlines():
        cabecera = CABECERA.match(sin_acentos(linea.strip()))
        if cabecera:
            dificultad_seccion = cabecera.group(1)
            continue

        parseada = parsear_linea(linea)
        if parseada is None:
            continue

        titulo, dificultad_explicita, descripcion = parseada

        # Un título repetido en el PDF crearía dos filas idénticas.
        clave = sin_acentos(titulo)
        if clave in vistos:
            continue
        vistos.add(clave)

        # Prioridad: marca en la propia línea > cabecera de sección >
        # geografía (solo viajes) > valor por defecto.
        dificultad = dificultad_explicita or dificultad_seccion
        if dificultad is None:
            dificultad = (
                clasificar_viaje(titulo) if categoria == 'viajes'
                else DIFICULTAD_POR_DEFECTO
            )

        gooals.append({
            'titulo': titulo,
            'descripcion': descripcion,
            'categoria': categoria,
            'dificultad': dificultad,
            'puntos': PUNTOS[dificultad],
        })

    return gooals


# ── Salida SQL ───────────────────────────────────────────────────
def literal(valor: str | None) -> str:
    """Literal SQL escapando la comilla simple, o NULL."""
    if valor is None or valor == '':
        return 'null'
    return "'" + valor.replace("'", "''") + "'"


def generar_sql(gooals: list[dict], categoria: str, origen: str) -> str:
    """SQL idempotente: relanzarlo no duplica gooals ya insertados.

    gooals_v2 no tiene índice único sobre `titulo` a propósito (dos categorías
    podrían compartir uno), así que el `where not exists` compara título +
    categoría en vez de apoyarse en un ON CONFLICT.
    """
    reparto = {d: sum(1 for g in gooals if g['dificultad'] == d) for d in PUNTOS}
    total_puntos = sum(g['puntos'] for g in gooals)

    lineas = [
        '-- ═══════════════════════════════════════════════════════════',
        f'-- GooALS — seed de gooals_v2: categoría "{categoria}"',
        f'-- Generado por scripts/seed-gooals/generar_sql.py desde {origen}',
        f'-- {len(gooals)} gooals · '
        + ' · '.join(f'{d}: {n}' for d, n in reparto.items())
        + f' · {total_puntos} puntos en total',
        '--',
        '-- Idempotente: puedes ejecutarlo varias veces sin duplicar nada.',
        '-- ═══════════════════════════════════════════════════════════',
        '',
    ]

    for g in gooals:
        lineas.append(
            'insert into gooals_v2 (titulo, descripcion, categoria, dificultad, puntos, activo)\n'
            'select {titulo}, {descripcion}, {categoria}, {dificultad}, {puntos}, true\n'
            'where not exists (\n'
            '  select 1 from gooals_v2 where titulo = {titulo} and categoria = {categoria}\n'
            ');'.format(
                titulo=literal(g['titulo']),
                descripcion=literal(g['descripcion']),
                categoria=literal(g['categoria']),
                dificultad=literal(g['dificultad']),
                puntos=g['puntos'],
            )
        )
        lineas.append('')

    return '\n'.join(lineas)


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Convierte un PDF de gooals en un SQL para Supabase.'
    )
    parser.add_argument('pdf', type=Path, help='PDF de origen, p. ej. pdfs/viajes.pdf')
    parser.add_argument('categoria', choices=CATEGORIAS, help='Categoría del catálogo')
    parser.add_argument(
        '-o', '--output', type=Path, default=None,
        help='Fichero de salida (por defecto output/<categoria>.sql)',
    )
    args = parser.parse_args()

    if not args.pdf.is_file():
        print(f'No encuentro el PDF: {args.pdf}', file=sys.stderr)
        return 1

    texto = extraer_texto(args.pdf)
    gooals = parsear(texto, args.categoria)

    if not gooals:
        print(
            f'No he sacado ningún gooal de {args.pdf}.\n'
            'Comprueba que el PDF tenga texto seleccionable (si es un escaneo, '
            'no vale) y que haya un gooal por línea.',
            file=sys.stderr,
        )
        return 1

    destino = args.output or (Path(__file__).parent / 'output' / f'{args.categoria}.sql')
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        generar_sql(gooals, args.categoria, args.pdf.name),
        encoding='utf-8',
    )

    reparto = {d: sum(1 for g in gooals if g['dificultad'] == d) for d in PUNTOS}
    print(f'{len(gooals)} gooals → {destino}')
    print('  ' + ' · '.join(f'{d}: {n}' for d, n in reparto.items()))
    print('Revisa el SQL antes de ejecutarlo en Supabase.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
