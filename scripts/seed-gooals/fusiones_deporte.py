#!/usr/bin/env python3
"""Genera fusiones_deporte.txt desde el PDF crudo.

    python fusiones_deporte.py ../../RETOS

El PDF de deporte es en buena parte una escalera: el mismo reto repetido
cambiando un numero, una maquina o el tiempo que hacia ese dia. Eso sirve para
un plan de entrenamiento, pero no para un perfil que se lea como una persona.

Cuatro reglas, decididas con David:

  A. Umbral de marca   "Correr 10 km en menos de 45 min" -> "Correr 10 km"
  C. Contexto          "Ruta de 50 km bajo lluvia"       -> "Ruta de 50 km"
  D. Maquina           Assault Bike / SkiErg / eliptica  -> una sola
  E. Distancia         solo los hitos que la gente reconoce; los intermedios
                       se funden en el hito inmediatamente inferior

Los hitos son los que alguien le cuenta a un amigo: 5K, 10K, media maraton,
maraton y ultra en carrera; 50, 100 y 200 km en bici. Nadie dice "he hecho 75
kilometros en bici", dice "he hecho cien".
"""
import re, sys, types, collections
from pathlib import Path

# ── Hitos por actividad (en la unidad del titulo) ────────────────────
HITOS = {
    'correr':     [5, 10, 21, 42, 100],
    'bicicleta':  [50, 100, 200],
    'senderismo': [10, 20, 40],
    'trail':      [10, 21, 42],
    'nadar':      [100, 1000, 3800],
    'remo':       [2000, 5000, 10000],
}

# ── C. Contexto que no cambia el recuerdo ────────────────────────────
CONTEXTO = re.compile(
    r'\s+(bajo (la )?lluvia|de noche( con (frontal|luces))?|por (la )?playa|por nieve|'
    r'por bosque|por asfalto|por monta[nñ]a|al amanecer|al atardecer|en otro pa[ií]s|'
    r'en una ciudad nueva|con viento|en verano|en invierno|junto al mar|'
    r'a primera hora del amanecer|a primera hora|en d[ií]a de calor|en cuesta|'
    r'sin parar|de una sentada|del tir[oó]n|'
    r'por una v[ií]a verde|con negative split|en solitario|en grupo|acompa[nñ]ad[oa])\b',
    re.I)

# ── A. Umbral de marca ───────────────────────────────────────────────
MARCA = re.compile(r'\s+en menos de .+$', re.I)

# ── D. Maquinas de cardio: la serie es la misma en todas ─────────────
MAQUINAS = re.compile(r'\s+en (Assault Bike|BikeErg|SkiErg|el[ií]ptica|remo indoor|'
                      r'stair climber|cinta|bicicleta est[aá]tica|escaladora)\b', re.I)


def actividad(titulo):
    """A qué familia de hitos pertenece el título, si es que a alguna."""
    t = titulo.lower()
    if 'bicicleta' in t or 'ciclista' in t or 'mtb' in t or 'pedalear' in t: return 'bicicleta'
    if 'trail' in t: return 'trail'
    if 'senderismo' in t or 'caminar' in t: return 'senderismo'
    if 'nadar' in t or 'natacion' in t or 'natación' in t: return 'nadar'
    if 'remo' in t: return 'remo'
    if 'correr' in t or 'maraton' in t or 'maratón' in t: return 'correr'
    return None


def hito_de(n, familia):
    """El hito inmediatamente inferior o igual a n. None si no hay familia."""
    if familia not in HITOS: return None
    hitos = HITOS[familia]
    validos = [h for h in hitos if h <= n]
    return validos[-1] if validos else hitos[0]


# 42,2 km ES el maraton y 21,1 km ES la media. El PDF los lista por separado y
# encima con puntos distintos, asi que se unifican antes de agrupar.
SINONIMOS = [
    (re.compile(r'\b42[.,]2\s?km\b', re.I), 'una maratón'),
    (re.compile(r'\b21[.,]1\s?km\b', re.I), 'una media maratón'),
]


def base(titulo):
    """El título sin marca, sin contexto, sin máquina y con los sinónimos unificados."""
    t = MARCA.sub('', titulo)
    for patron, canonico in SINONIMOS:
        t = patron.sub(canonico, t)
    t = CONTEXTO.sub('', t)
    t = MAQUINAS.sub('', t)
    return re.sub(r'\s+', ' ', t).strip()


def clave(titulo):
    """Dos títulos con la misma clave se funden en uno."""
    b = base(titulo)
    fam = actividad(b)
    # Se sustituye la cifra por su hito, para que 30, 40 y 45 km caigan en 10
    # y 60, 75 y 90 caigan en 50.
    # El hito se marca entre guillemets para que el barrido de números de la
    # línea siguiente no lo borre: sin esto los 17 peldaños de bici, de 10 a
    # 300 km, acababan todos en el mismo grupo.
    def a_hito(m):
        n = int(m.group(1))
        h = hito_de(n, fam)
        if h is None: return '#'
        return f'«{chr(97 + HITOS[fam].index(h))}»{m.group(2) or ""}'
    b = re.sub(r'(\d+)\s?(km|m|metros)?\b', a_hito, b, count=1)
    return re.sub(r'\d+', '#', b).lower()


NUMERO = re.compile(r'\s*\d+([.,]\d+)?\s?(km|m|metros|minutos|min|calor[ií]as|h)?\b')


def titular(miembros):
    """El título que se queda de un grupo.

    No puede ser el peldaño más bajo: un grupo que va de 5 a 300 km titulado
    "Completar 5 km en bicicleta" dice menos que cualquiera de sus miembros. Si
    el grupo llega a un hito, el título es el del hito; si todos están por
    debajo, se quita el número y queda el reto abierto.
    """
    bases = [base(t) for t in miembros]
    fam = actividad(bases[0])
    hitos = HITOS.get(fam, [])

    cifras = []
    for b in bases:
        m = re.search(r'(\d+)', b)
        if m: cifras.append((int(m.group(1)), b))

    if cifras and hitos:
        alcanzados = [h for h in hitos if any(n >= h for n, _ in cifras)]
        if alcanzados:
            meta = max(alcanzados)
            # El miembro que nombra ese hito exacto, si existe.
            exactos = [b for n, b in cifras if n == meta]
            if exactos:
                return min(exactos, key=len)

    # Sin hito alcanzado: reto abierto, sin número que prometa de más.
    abierto = NUMERO.sub(' ', min(bases, key=len))
    abierto = re.sub(r'\s+', ' ', abierto).strip()
    abierto = re.sub(r'\s+(en un d[ií]a|en una sesi[oó]n|sin parar)$', '', abierto, flags=re.I)
    return abierto or min(bases, key=len)


# ── Familias que se borran enteras ───────────────────────────────────
# Aguantar 40 minutos en una eliptica no es algo que nadie cuente en un perfil.
# Como reto de gimnasio esta bien; como experiencia de vida, no. El press banca
# o la sentadilla si: son marcas con nombre que la gente persigue y comparte.
A_BORRAR = [
    'Mantener trabajo continuo durante 10 minutos en Assault Bike',
    'Acumular 50 calorías en Assault Bike en una sola sesión',
    'Acumular 50 calorías en remo indoor',
    'Completar 1000 m en remo indoor',
    'Completar 2.000 m en remo indoor en menos de 10 minutos',
]


# ── Títulos escritos a mano ──────────────────────────────────────────
# Quitar el número de un título deja frases cojas ("Nadar", "Completar",
# "Mantener trabajo continuo durante"). Estos grupos se nombran a mano; la clave
# es uno de los retos que absorben, que no cambia entre pasadas.
A_MANO = {
 'Mantener trabajo continuo durante 10 minutos en Assault Bike':
     'Aguantar 30 minutos de cardio sin parar',
 'Acumular 50 calorías en Assault Bike en una sola sesión':
     'Quemar 500 calorías en una sesión de cardio',
 'Acumular 50 calorías en remo indoor':
     'Quemar 500 calorías remando',
 'Nadar 100 m sin parar':          'Nadar 500 metros sin parar',
 'Nadar 500 m en piscina':         'Nadar 2.000 metros en piscina',
 'Completar 1000 m en remo indoor': 'Completar 5.000 metros en remo indoor',
 'Completar 2.000 m en remo indoor en menos de 10 minutos':
     'Completar 2.000 metros de remo',
 'Acumular 250 m de desnivel positivo en bicicleta en un día':
     'Acumular 1.000 m de desnivel en bicicleta',
 'Acumular 250 m de desnivel positivo corriendo en una sesión':
     'Acumular 1.000 m de desnivel corriendo',
 'Pedalear durante 1 horas en un mismo día': 'Pedalear 5 horas en un mismo día',
 'Alcanzar una cumbre de más de 1000 m con preparación adecuada':
     'Alcanzar una cumbre de más de 3.000 m',
 'Completar 10 burpees en una sesión': 'Completar 100 burpees seguidos',
 'Completar una ruta gravel de 20 km': 'Completar una ruta gravel de 100 km',
 'Completar un AMRAP continuo de 10 minutos': 'Completar un AMRAP de 20 minutos',
 'Completar una carrera OCR de 3 km': 'Completar una carrera de obstáculos',
 'Esquiar 20 km en un día':          'Esquiar 50 km en un día',
}


def main():
    base_dir = Path(sys.argv[1] if len(sys.argv) > 1 else '../../RETOS')
    src = (Path(__file__).parent / 'generar_sql.py').read_text(encoding='utf-8')
    src = src.replace("if __name__ == '__main__':\n    raise SystemExit(main())", '')
    m = types.ModuleType('g')
    m.__dict__['__file__'] = str(Path(__file__).parent / 'generar_sql.py')
    exec(compile(src, 'generar_sql.py', 'exec'), m.__dict__)

    filas = m.limpiar(m.parse_deporte(base_dir / 'bucket_list_1141_retos_deportivos.pdf'))

    grupos = collections.defaultdict(list)
    for r in filas:
        grupos[clave(r['titulo'])].append(r['titulo'])

    fusiones = {k: v for k, v in grupos.items() if len(v) > 1}
    intactos = [v[0] for k, v in grupos.items() if len(v) == 1]

    L = ['# GooALS — fusiones propuestas para la categoría deporte',
         '#',
         '# El PDF repite el mismo reto cambiando un número, una máquina o el tiempo',
         '# que se hizo ese día. Eso es un plan de entrenamiento, no un perfil.',
         '#',
         '# Cuatro reglas:',
         '#   · fuera el umbral de marca — "Correr 10 km", no "en menos de 45 min"',
         '#   · fuera el contexto — la ruta de 50 km se cuenta una vez, no siete',
         '#   · una sola serie de cardio, no una por máquina de gimnasio',
         '#   · solo los hitos que se cuentan: 5K, 10K, media, maratón, ultra',
         '#',
         '# Formato: la línea sin sangrar es el gooal que se queda; las que empiezan',
         '# por "<" son los que absorbe. Borra una línea "<" para salvar ese reto,',
         '# o un bloque entero para deshacer el grupo.',
         '#',
         '# Un bloque titulado BORRAR elimina a sus miembros en vez de fundirlos.',
         '#',
         f'# {len(filas)} retos de partida',
         '']

    for k, v in sorted(fusiones.items(), key=lambda x: -len(x[1])):
        if any(t in A_BORRAR for t in v):
            nuevo = 'BORRAR'
        else:
            nuevo = next((A_MANO[t] for t in v if t in A_MANO), None) or titular(v)
        L.append(nuevo)
        for t in v:
            L.append(f'< {t}')
        L.append('')

    L.append('# ── Se quedan tal cual ──')
    L += [f'# {t}' for t in sorted(intactos)]

    salida = Path(__file__).parent / 'fusiones_deporte.txt'
    salida.write_text('\n'.join(L) + '\n', encoding='utf-8')

    absorbidos = sum(len(v) for v in fusiones.values())
    print(f'deporte: {len(filas)} retos')
    print(f'  {absorbidos} se funden en {len(fusiones)} grupos')
    print(f'  {len(intactos)} se quedan tal cual')
    print(f'  → {len(fusiones) + len(intactos)} retos finales')
    print(f'\nEscrito en {salida.name}')


main()
