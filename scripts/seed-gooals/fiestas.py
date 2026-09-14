#!/usr/bin/env python3
"""Convierte el PDF de fiestas icónicas en un bloque de Espectáculos.

    python fiestas.py ../../RETOS/fiestas_iconicas_del_mundo.pdf

Una fiesta popular es un espectáculo con sede fija y fecha fija: el Carnaval de
Río es en Río, San Fermín en Pamplona, el Oktoberfest en Múnich. Tiene
coordenada, así que va al mapa — y es de lo mejor que puede aparecer cuando
alguien mira "qué hay por esta zona" en marzo.

── Los puntos ───────────────────────────────────────────────────────

El PDF ya trae su propia nota en estrellas, pero no se copia tal cual: sus
★★ van desde la Semana Santa de Sevilla hasta el Moussem de Tan-Tan, y esas
dos no valen lo mismo para nadie.

    ★★★  →  3   las 21 que conoce cualquiera
    ★★   →  1   por defecto
    ★★   →  2   solo las de DOS, escritas a mano

Es el mismo criterio que en los estadios: 3 es peregrinación, 2 se reconoce
fuera de su país, 1 cuenta pero no impresiona.
"""
import re, sys, warnings
from pathlib import Path

warnings.filterwarnings('ignore')
import pypdf

# ★★ que sí se reconocen fuera de su país
DOS = {
    'Semana Santa de Sevilla', 'Feria de Abril', 'Carnaval de Cádiz',
    'Carnaval de Santa Cruz de Tenerife', 'La Mercè', 'Moros y Cristianos',
    'Notting Hill Carnival', 'Palio di Siena', 'Battle of the Oranges',
    'Fête des Lumières', 'Basler Fasnacht', 'Up Helly Aa',
    'Diwali', 'Gion Matsuri', 'Hanami', 'Loi Krathong', 'Naadam',
    'Carnaval de Nueva Orleans', 'Burning of Judas', 'Fiesta de la Vendimia',
    'Semana Santa de Málaga', 'Fiestas del Pilar', 'Carnaval de Colonia',
    'Carnaval de Niza', 'Thaipusam', 'Boryeong Mud Festival',
}

# Nombres que piden artículo delante ("Vivir EL Oktoberfest").
ARTICULO = re.compile(
    r'^(Carnaval|Festival|Fiesta|Fiestas|D[ií]a|Feria|Batalla|Noche|Semana|'
    r'Oktoberfest|Palio|Encierro|Romer[ií]a|Procesi[oó]n|Desfile|Danza|'
    r'Bat|Boryeong|Great|Lake|Moussem|Durbar|Timkat|Hogmanay)\b', re.I)
FEMENINO = re.compile(r'^(Fiesta|Fiestas|Feria|Batalla|Noche|Semana|Romer[ií]a|'
                      r'Procesi[oó]n|Danza|Tomatina)\b', re.I)


# Unos cuantos vienen en inglés o con el nombre entre paréntesis. Como el
# título es lo que se lee en un perfil español, se traducen a mano.
NOMBRE = {
    'Chinese New Year': 'el Año Nuevo Chino',
    "King's Day (Koningsdag)": 'el Día del Rey',
    "St. Patrick's Festival": 'el día de San Patricio',
    'Yi Peng / Festival de Faroles': 'el Yi Peng',
    'Battle of the Oranges': 'la Batalla de las Naranjas',
    'Albuquerque International Balloon Fiesta': 'el festival de globos de Albuquerque',
    'Boryeong Mud Festival': 'el festival del barro de Boryeong',
    'Up Helly Aa': 'el Up Helly Aa',
    'Burning of Judas': 'la Quema de Judas',
    'Great Bull Run': 'el Great Bull Run',
    'Lake of Stars': 'el Lake of Stars',
    'Durbar Festival': 'el Durbar',
    'Basler Fasnacht': 'el carnaval de Basilea',
    'Notting Hill Carnival': 'el carnaval de Notting Hill',
    'Hogmanay': 'el Hogmanay de Edimburgo',
    'Krampusnacht': 'la Krampusnacht',
    'Naadam': 'el Naadam',
    'Thaipusam': 'el Thaipusam',
    'Hanami': 'el Hanami',
    'Loi Krathong': 'el Loi Krathong',
}


def titular(nombre):
    """'Vivir el Oktoberfest', 'Vivir San Fermín', 'Vivir la Tomatina'."""
    if nombre in NOMBRE:
        return f'Vivir {NOMBRE[nombre]}'
    if nombre.startswith(('La ', 'El ', 'Las ', 'Los ')):
        return f'Vivir {nombre[0].lower()}{nombre[1:]}'
    if ARTICULO.match(nombre):
        art = 'la' if FEMENINO.match(nombre) else 'el'
        return f'Vivir {art} {nombre}'
    return f'Vivir {nombre}'


def lugar(loc):
    """La primera sede: el PDF encadena alternativas con / y con comas."""
    p = loc.split('/')[0].strip()
    # "Pamplona, Navarra" → Pamplona. La provincia no ayuda a encontrar nada.
    return p.split(',')[0].strip()


def parse(pdf):
    L = [l.strip() for l in
         '\n'.join(p.extract_text() for p in pypdf.PdfReader(pdf).pages).split('\n')
         if l.strip()]
    out, i = [], 0
    while i < len(L):
        if set(L[i]) == {'★'} and i + 5 < len(L) and L[i + 1] == '■':
            out.append((len(L[i]), L[i + 2], L[i + 3], L[i + 4], L[i + 5]))
            i += 6
            continue
        i += 1
    return out


def puntos(estrellas, nombre):
    if estrellas >= 3: return 3
    if any(d.lower() in nombre.lower() for d in DOS): return 2
    return 1


PAISES = {'EE. UU.': 'Estados Unidos', 'EEUU': 'Estados Unidos'}


def main():
    pdf = Path(sys.argv[1] if len(sys.argv) > 1
               else '../../RETOS/fiestas_iconicas_del_mundo.pdf')
    filas = parse(pdf)

    L = ['# GooALS — fiestas icónicas, generado por fiestas.py. NO editar a mano.',
         '#',
         '# Formato: puntos | título | ciudad | país | consulta de mapa',
         '#',
         '# La época del año que trae el PDF (San Fermín 6-14 julio, Holi en',
         '# marzo) no se guarda todavía. El día que el mapa sepa la fecha podrá',
         '# avisar de lo que cae cerca en las próximas semanas, que es justo lo',
         '# que hace útil un mapa de viaje.',
         '']
    vistos = set()
    for estrellas, nombre, loc, pais, epoca in filas:
        titulo = titular(nombre)
        if titulo in vistos:
            # "Chinese New Year" sale en Hong Kong, Singapur y San Francisco.
            titulo = f'{titulo} · {lugar(loc)}'
        vistos.add(titulo)
        ciudad = lugar(loc)
        p = PAISES.get(pais, pais)
        L.append(f'{puntos(estrellas, nombre)} | {titulo} | {ciudad} | {p} | {nombre}, {ciudad}')

    salida = Path(__file__).parent / 'fiestas_generado.txt'
    salida.write_text('\n'.join(L) + '\n', encoding='utf-8')

    rep = {}
    for e, n, _, _, _ in filas: rep[puntos(e, n)] = rep.get(puntos(e, n), 0) + 1
    print(f'{len(filas)} fiestas · {len(vistos)} títulos únicos')
    for p in sorted(rep, reverse=True): print(f'  +{p}: {rep[p]}')
    print(f'\nEscrito en {salida.name}')


main()
