#!/usr/bin/env python3
"""Convierte el PDF de festivales en la sección de festivales de Espectáculos.

    python festivales.py ../../RETOS/festivales_rock_electronica_mundo.pdf

Un festival NO es música, es un espectáculo: se celebra siempre en el mismo
sitio —Glastonbury en Worthy Farm, Tomorrowland en De Schorre— así que tiene
coordenada y va al mapa. "Estuve en Tomorrowland" es una historia; "vivir
música electrónica" no es nada.

Por eso los 379 salen de la categoría música y entran en espectáculos, igual
que los estadios. En música se queda lo que de verdad es música y no un sitio:
aprender un instrumento, ir a la ópera, salir de fiesta en Ibiza.

Puntos: casi todos a 1. Solo suben los que reconoce alguien que no va a
festivales, que son pocos y se cuentan con los dedos.
"""
import re, sys, warnings
from pathlib import Path

warnings.filterwarnings('ignore')
import pypdf

# ── Los cuatro que conoce todo el mundo ──────────────────────────────
TRES = {'Tomorrowland', 'Glastonbury Festival', 'Coachella', 'Burning Man'}

# ── Los que reconoce cualquiera que oiga música ──────────────────────
DOS = {
    'Download Festival', 'Reading Festival', 'Leeds Festival', 'Rock am Ring',
    'Wacken Open Air', 'Hellfest', 'Rock en Seine', 'Graspop Metal Meeting',
    'Rock Werchter', 'Pukkelpop', 'Roskilde Festival', 'Sziget Festival',
    'Primavera Sound', 'Sónar', 'Mad Cool Festival', 'Bilbao BBK Live',
    'Lollapalooza', 'Lollapalooza Chicago', 'Rock in Rio', 'Exit Festival',
    'Fuji Rock Festival', 'Montreux Jazz Festival', 'Ultra Music Festival',
    'Electric Daisy Carnival', 'EDC Las Vegas', 'Awakenings', 'Time Warp',
    'Creamfields', 'Defqon.1', 'Mysteryland', 'Dour Festival',
    'Untold Festival', 'Untold', 'Sensation', 'Ozora Festival',
    'Boom Festival', 'Afro Nation', 'Bonnaroo', 'Austin City Limits',
    'Isle of Wight Festival', 'Sea Dance', 'Zamna',
}

# El PDF trae la localización con barras ("Donington Park / Leicestershire",
# "Saint-Cloud / París"). Para el mapa vale la primera; para leerlo, la última
# suele ser la ciudad conocida. Se usa la primera, que es el recinto.
def lugar(loc):
    partes = [p.strip() for p in loc.split('/') if p.strip()]
    return partes[0] if partes else loc.strip()


def parse(pdf):
    L = [l.strip() for l in
         '\n'.join(p.extract_text() for p in pypdf.PdfReader(pdf).pages).split('\n')
         if l.strip()]
    heads = [x for x in L if ' - ' in x and 'festivales' in x.lower()]
    out, i = [], 0
    while i < len(L):
        if L[i] in heads:
            i += 1; continue
        if L[i] == '■' and i + 4 < len(L):
            out.append((L[i + 1], L[i + 2], L[i + 3]))
            i += 5; continue
        i += 1
    return out


def puntos(nombre):
    if any(k == nombre or k in nombre for k in TRES): return 3
    if any(k == nombre or k in nombre for k in DOS):  return 2
    return 1


def main():
    pdf = Path(sys.argv[1] if len(sys.argv) > 1
               else '../../RETOS/festivales_rock_electronica_mundo.pdf')
    filas = parse(pdf)

    lineas = ['# GooALS — festivales, generado por festivales.py. NO editar a mano.',
              '#',
              '# Formato: puntos | título | ciudad | país | consulta de mapa',
              '#',
              '# La consulta lleva el nombre del festival con su país porque el',
              '# recinto ("Worthy Farm", "De Schorre") no aparece en el título.',
              '']
    vistos = set()
    for nombre, loc, pais in filas:
        titulo = f'Ir al {nombre}' if not nombre.lower().startswith(('el ', 'la ')) \
                 else f'Ir a {nombre}'
        if titulo in vistos:
            continue
        vistos.add(titulo)
        ciudad = lugar(loc)
        lineas.append(f'{puntos(nombre)} | {titulo} | {ciudad} | {pais} | {nombre}, {ciudad}')

    salida = Path(__file__).parent / 'festivales_generado.txt'
    salida.write_text('\n'.join(lineas) + '\n', encoding='utf-8')

    rep = {}
    for n, _, _ in filas: rep[puntos(n)] = rep.get(puntos(n), 0) + 1
    print(f'{len(filas)} festivales en el PDF · {len(vistos)} títulos únicos')
    for p in sorted(rep, reverse=True): print(f'  +{p}: {rep[p]}')
    print(f'\nEscrito en {salida.name}')


main()
