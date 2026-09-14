#!/usr/bin/env python3
"""Convierte el PDF de estadios en la sección de fútbol de espectaculos.txt.

    python estadios.py ../../RETOS/estadios_futbol_primeras_divisiones_mundo.pdf

El PDF es una tabla limpia —estadio · club · ciudad, agrupada por liga— así que
aquí no hay fusiones ni limpieza que hacer. Lo único que decide este script es
cuánto vale cada estadio y cómo se escribe la ciudad en español.

Los puntos NO son la distancia a tu casa: son lo que pesa el sitio. Ir al
Bernabéu vale lo mismo vivas en Madrid o en Tokio. Tres escalones:

    3  templo — se viaja expresamente a verlo
    2  club grande — se reconoce fuera de su país
    1  el resto — cuenta, pero lo tiene mucha gente

Un aficionado obsesivo que hiciera los 177 juntaría unos 230 puntos. Son 177
viajes; que eso le deje en Leyenda está bien.
"""
import re, sys, warnings
from pathlib import Path

warnings.filterwarnings('ignore')
import pypdf

# ── Cabeceras de sección del PDF y país que implica cada una ─────────
SECCIONES = {
    'España - LaLiga':                'España',
    'Inglaterra - Premier League':    'Reino Unido',
    'Alemania - Bundesliga':          'Alemania',
    'Italia - Serie A':               'Italia',
    'Francia - Ligue 1':              'Francia',
    'Portugal - Primeira Liga':       'Portugal',
    'Países Bajos - Eredivisie':      'Países Bajos',
    'Escocia':                        'Reino Unido',
    'Turquía':                        'Turquía',
    'Argentina':                      'Argentina',
    'Brasil':                         'Brasil',
    'MLS - EE.UU./Canadá':            None,   # va en la ciudad
    'México':                         'México',
    'Asia / Oceanía':                 None,
    'Europa - otros imprescindibles': None,
    'Sudamérica / África - otros':    None,
}

# Ciudades de MLS que están en Canadá; el resto de esa sección es EE. UU.
CANADA = {'Vancouver', 'Toronto', 'Montreal'}

# ── El PDF perdió algunos caracteres al generarse ────────────────────
MOJIBAKE = {
    'Tüpra■ Stadyumu': 'Tüpraş Stadyumu',
    '■ükrü Saraco■lu': 'Şükrü Saracoğlu',
    'Rajko Miti■':     'Rajko Mitić',
    'Arena Na■ional■': 'Arena Națională',
    'Mâs Monumental':  'Más Monumental',
    'Maracanã':        'Maracaná',
}

# ── Ciudades: el PDF las trae en inglés ──────────────────────────────
CIUDADES = {
    'London': 'Londres', 'Munich': 'Múnich', 'Cologne': 'Colonia',
    'Milan': 'Milán', 'Turin': 'Turín', 'Naples': 'Nápoles', 'Rome': 'Roma',
    'Florence': 'Florencia', 'Genoa': 'Génova', 'Paris': 'París',
    'Lisbon': 'Lisboa', 'Bruges': 'Brujas', 'Brussels': 'Bruselas',
    'Bern': 'Berna', 'Copenhagen': 'Copenhague', 'Warsaw': 'Varsovia',
    'Prague': 'Praga', 'Athens': 'Atenas', 'Piraeus': 'El Pireo',
    'Thessaloniki': 'Salónica', 'Belgrade': 'Belgrado',
    'Bucharest': 'Bucarest', 'Istanbul': 'Estambul', 'Edinburgh': 'Edimburgo',
    'Mexico City': 'Ciudad de México', 'Rio de Janeiro': 'Río de Janeiro',
    'Los Angeles': 'Los Ángeles', 'Seoul': 'Seúl', 'Sydney': 'Sídney',
    'Riyadh': 'Riad', 'Jeddah': 'Yeda', 'Cairo': 'El Cairo',
    'Vienna': 'Viena', 'Moscow': 'Moscú',
    'Monaco': 'Mónaco', 'Strasbourg': 'Estrasburgo', 'Nice': 'Niza',
    'Amsterdam': 'Ámsterdam', 'Marseille': 'Marsella', 'Bologna': 'Bolonia',
    'Bergamo': 'Bérgamo', 'Porto': 'Oporto', 'Salzburg': 'Salzburgo',
    'Basel': 'Basilea', 'Freiburg': 'Friburgo', 'Mainz': 'Maguncia',
    'Hamburg': 'Hamburgo', 'Augsburg': 'Augsburgo', 'Berlin': 'Berlín',
}

# ── Estadios que en español se dicen sin artículo ────────────────────
# "Un partido en Anfield", no "en el Anfield". Es irregular y no hay regla
# que lo acierte, así que va a mano. Si alguno suena raro, se quita de aquí
# (o se añade) y se vuelve a generar.
SIN_ARTICULO = {
    'Anfield', 'Old Trafford', 'Stamford Bridge', 'Villa Park', 'Elland Road',
    'Craven Cottage', 'Selhurst Park', 'Portman Road', "St James' Park",
    'Ibrox', 'Celtic Park', 'Easter Road', 'Tynecastle Park', 'Pittodrie',
    'Wembley', 'San Siro', 'Mestalla', 'Balaídos', 'Vallecas', 'Montilivi',
    'Mendizorroza', 'Son Moix', 'Maksimir', 'Toumba', 'Parken', 'Wankdorf',
    'De Kuip', 'De Grolsch Veste', 'Vila Belmiro', 'Beira-Rio', 'Fonte Nova',
    'Bollaert-Delelis', 'Loftus Versfeld', 'Nemesio Díez', 'Pedro Bidegain',
}

# ── Templos: se viaja expresamente a verlos ──────────────────────────
TRES = {
    'Santiago Bernabéu', 'Spotify Camp Nou', 'Anfield', 'Old Trafford',
    'San Siro', 'Signal Iduna Park', 'Allianz Arena', 'La Bombonera',
    'Maracaná', 'Estadio Azteca', 'Celtic Park', 'Más Monumental',
}

# ── Club grande: se reconoce fuera de su país ────────────────────────
DOS = {
    # España
    'Riyadh Air Metropolitano', 'San Mamés', 'Ramón Sánchez-Pizjuán',
    'Mestalla', 'Benito Villamarín',
    # Inglaterra y Escocia
    'Emirates Stadium', 'Etihad Stadium', 'Stamford Bridge',
    'Tottenham Hotspur Stadium', "St James' Park", 'Villa Park',
    'Elland Road', 'Ibrox',
    # Alemania
    'Red Bull Arena', 'Volksparkstadion', 'Millerntor-Stadion',
    'Deutsche Bank Park', 'Weserstadion', 'RheinEnergieSTADION',
    # Italia
    'Allianz Stadium', 'Diego Armando Maradona', 'Stadio Olimpico',
    'Artemio Franchi',
    # Francia, Portugal, Países Bajos
    'Parc des Princes', 'Orange Vélodrome', 'Stade Louis II',
    'Estádio da Luz', 'Estádio do Dragão', 'José Alvalade',
    'Johan Cruijff ArenA', 'De Kuip', 'Philips Stadion',
    # Turquía y Balcanes
    'RAMS Park', 'Tüpraş Stadyumu', 'Şükrü Saracoğlu', 'Rajko Mitić',
    'Maksimir', 'Karaiskakis',
    # América
    'Neo Química Arena', 'Allianz Parque', 'MorumBIS', 'Mineirão',
    'Beira-Rio', 'Vila Belmiro', 'Olímpico Universitario', 'Estadio BBVA',
    'Gran Parque Central', 'Campeón del Siglo',
    'Monumental David Arellano', 'Hernando Siles',
    'Lumen Field', 'Mercedes-Benz Stadium', 'Chase Stadium',
    # África
    'Stade Mohammed V', 'Cairo International Stadium',
}


def arreglar(s):
    return MOJIBAKE.get(s, s)


def parse(pdf):
    L = [l.strip() for l in
         '\n'.join(p.extract_text() for p in pypdf.PdfReader(pdf).pages).split('\n')
         if l.strip()]
    sec, out, i = None, [], 0
    while i < len(L):
        if L[i] in SECCIONES:
            sec = L[i]; i += 1; continue
        if L[i] == '■' and i + 3 < len(L):
            out.append((sec, arreglar(L[i + 1]), L[i + 2], arreglar(L[i + 3])))
            i += 4; continue
        i += 1
    return out


def lugar(sec, bruto):
    """(ciudad, país) a partir de la celda de localización y la sección."""
    if ', ' in bruto:
        ciudad, pais = bruto.rsplit(', ', 1)
    else:
        ciudad, pais = bruto, SECCIONES[sec]
    if pais is None:                       # MLS sin país en la celda
        pais = 'Canadá' if ciudad in CANADA else 'Estados Unidos'
    pais = {'EE.UU.': 'Estados Unidos', 'Japón': 'Japón'}.get(pais, pais)
    return CIUDADES.get(ciudad, ciudad), pais


def puntos(estadio):
    if estadio in TRES: return 3
    if estadio in DOS:  return 2
    return 1


def main():
    pdf = Path(sys.argv[1] if len(sys.argv) > 1
               else '../../RETOS/estadios_futbol_primeras_divisiones_mundo.pdf')
    filas = parse(pdf)

    lineas, orden = [], []
    for sec, estadio, club, loc in filas:
        if sec not in orden: orden.append(sec)
    for sec in orden:
        lineas.append(f'\n### {sec}\n')
        for s, estadio, club, loc in filas:
            if s != sec: continue
            ciudad, pais = lugar(s, loc)
            # El artículo suena mal delante de nombres que ya lo llevan
            # ("Ver un partido en el La Bombonera") o de los que son un
            # nombre propio suelto ("en Anfield", "en Old Trafford").
            art = 'el '
            if estadio in SIN_ARTICULO: art = ''
            if re.match(r'^(el|la|los|las|le|de)\s', estadio, re.I): art = ''
            lineas.append(f'{puntos(estadio)} | Ver un partido en {art}{estadio} '
                          f'| {ciudad} | {pais}')

    salida = Path(__file__).parent / 'estadios_generado.txt'
    salida.write_text('\n'.join(lineas) + '\n', encoding='utf-8')

    tot = sum(puntos(e) for _, e, _, _ in filas)
    rep = {}
    for _, e, _, _ in filas: rep[puntos(e)] = rep.get(puntos(e), 0) + 1
    print(f'{len(filas)} estadios · {tot} puntos en total')
    for p in sorted(rep, reverse=True):
        print(f'  +{p}: {rep[p]}')
    print(f'\nEscrito en {salida.name}')


main()
