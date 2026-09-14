#!/usr/bin/env python3
"""GooALS — convierte los PDFs de retos en SQL + JSON para sembrar gooals_v2.

    python generar_sql.py ../../RETOS          # los 6 PDFs de golpe
    python generar_sql.py ../../RETOS musica   # solo una categoria

Escribe output/<categoria>.sql (idempotente, para el SQL Editor de Supabase) y
gooals.json (que consume insertar.mjs para sembrar via API REST).

Los PDFs traen tres formatos distintos; hay un parser para cada uno:

  A. viajes      tabla  numero / lugar / region, agrupada por continente y pais
  B. deporte     "[ ] Titulo    Dificultad N/5", con secciones "X - N retos"
  C. el resto    "0001 [ ] Titulo - Ciudad, Pais [D2]", con secciones
  D. espectaculos  no es PDF: dos ficheros de texto, "puntos | titulo |
                   ciudad | pais" (estadios_generado.txt + espectaculos.txt)

Baremo: la escala 1-5 de los PDFs se mapea a D1-2 -> facil (1 pt),
D3-4 -> dificil (5 pts), D5 -> epico (10 pts). Mismo baremo que
src/lib/gooals.ts: si cambia alli, cambia aqui.

La dificultad es la ETIQUETA y los puntos son un numero dentro de su banda
(facil 1-3, dificil 4-7, epico 8-10). Los PDFs solo dan 1, 5 y 10 porque su
escala D1-5 no da para mas. Espectaculos escribe los puntos a mano y por eso
ahi si aparecen el 2 y el 3: un partido en el Bernabeu y otro en el Zorrilla
son los dos "faciles", pero no valen lo mismo.

viajes no trae dificultad, asi que sale del continente (Europa -> facil,
Oceania y destinos remotos -> epico, el resto -> dificil).

Requiere: pip install pypdf
"""
import json, re, sys, unicodedata
from pathlib import Path
from pypdf import PdfReader

PUNTOS = {'facil': 1, 'dificil': 5, 'epico': 10}

# La dificultad es la etiqueta; los puntos son un numero DENTRO de su banda.
# Hasta ahora solo existian 1, 5 y 10 porque todo salia de la escala D1-5 de los
# PDFs, que no da para mas matiz. Espectaculos si: no es lo mismo un partido en
# el Bernabeu que en el Zorrilla, y los dos son "facil". De ahi el 2 y el 3.
BANDA = {'facil': (1, 3), 'dificil': (4, 7), 'epico': (8, 10)}


def dificultad_de_puntos(p):
    """La etiqueta que le toca a un numero de puntos escrito a mano."""
    for nombre, (lo, hi) in BANDA.items():
        if lo <= p <= hi:
            return nombre
    raise ValueError(f'puntos fuera de escala: {p}')


# D1-2 -> facil, D3-4 -> dificil, D5 -> epico
D_MAP = {1: 'facil', 2: 'facil', 3: 'dificil', 4: 'dificil', 5: 'epico'}
# El PDF de aventura no baja de D3, asi que con el mapeo comun la categoria se
# queda sin ningun reto de 1 punto: nadie tiene por donde entrar. Se reescala
# dentro de la categoria usando su propio rango.
D_MAP_AVENTURA = {3: 'facil', 4: 'dificil', 5: 'epico'}

def sin_acentos(t):
    n = unicodedata.normalize('NFD', t.lower())
    return ''.join(c for c in n if unicodedata.category(c) != 'Mn')

def texto(p):
    return '\n'.join((pg.extract_text() or '') for pg in PdfReader(str(p)).pages)

def lineas(p):
    return [l.strip() for l in texto(p).splitlines() if l.strip()]

# ── Geografia: un reto lejos de casa cuesta mas que el mismo reto aqui ──
# Se aplica a TODAS las categorias que traen pais, no solo a viajes: probar
# ramen en Tokio no es el mismo reto que unas tapas, aunque el PDF ponga D2 a
# los dos. La dificultad final es la MAYOR entre la del PDF y la geografica.
EUROPA_PAISES = {
    'espana','portugal','francia','italia','reino unido','alemania','austria',
    'suiza','paises bajos','belgica','grecia','croacia','noruega','suecia',
    'finlandia','dinamarca','islandia','polonia','chequia','republica checa',
    'hungria','rumania','bulgaria','eslovenia','eslovaquia','estonia','letonia',
    'lituania','malta','chipre','albania','serbia','montenegro',
    'bosnia y herzegovina','irlanda','turquia','luxemburgo','andorra','monaco',
    'ucrania','escocia','inglaterra','gales','azores','madeira','balcanes',
    'europa','escandinavia','georgia','armenia',
}
OCEANIA_REMOTO_PAISES = {
    'australia','nueva zelanda','fiyi','polinesia','papua nueva guinea',
    'islas cook','samoa','tonga','vanuatu','oceania','antartida','groenlandia',
    'svalbard','isla de pascua','galapagos','nepal','butan','mongolia',
    'madagascar','kirguistan',
}
ORDEN = ['facil', 'dificil', 'epico']


# Retos que son remotos por lo que son, aunque el PDF no anote pais
# ("Perseguir auroras boreales", "Ver osos polares"): sin esto colaban baratos.
REMOTO_EN_TITULO = {
    'artico', 'antartid', 'polar', 'aurora boreal', 'auroras boreales',
    'sol de medianoche', 'groenlandia', 'svalbard', 'pinguino', 'oso polar',
    'osos polares', 'iceberg', 'circulo polar',
}


def dificultad_geografica(pais, titulo=''):
    """Dificultad que impone el destino, o None si no hay nada que lo situe."""
    t = sin_acentos(titulo)
    if any(r in t for r in REMOTO_EN_TITULO):
        return 'epico'
    if not pais:
        return None
    p = sin_acentos(pais)
    if any(o in p for o in OCEANIA_REMOTO_PAISES):
        return 'epico'
    if any(e == p or e in p for e in EUROPA_PAISES):
        return 'facil'
    return 'dificil'


def combinar(dificultad, geografica):
    """La mayor de las dos: el PDF nunca baja lo que impone la distancia."""
    if geografica is None:
        return dificultad
    return max(dificultad, geografica, key=ORDEN.index)


# ── Fusiones manuales (aventura) ─────────────────────────────────────
# Los PDFs de aventura repiten la misma actividad en distintos sitios
# ("Esquiar en Chamonix / Dolomitas / St. Anton..."). Es el mismo recuerdo, asi
# que se colapsan en un gooal deslocalizado. El fichero fusiones_<cat>.txt es
# editable a mano: una linea sin sangrar es el gooal que se queda, y las que
# empiezan por "<" son los retos que absorbe.
# Un bloque cuyo titulo es exactamente BORRAR no funde: elimina. Sirve para
# familias enteras que no son un reto — el cardio en maquina de gimnasio no se
# cuenta en un perfil, se cuenta en una app de entrenamiento.
BORRAR = 'BORRAR'


def leer_fusiones(categoria):
    """{titulo original: titulo nuevo} desde fusiones_<categoria>.txt.

    El titulo nuevo puede ser BORRAR, y entonces el reto desaparece.
    """
    ruta = Path(__file__).parent / f'fusiones_{categoria}.txt'
    if not ruta.is_file():
        return {}
    mapa, actual = {}, None
    for linea in ruta.read_text(encoding='utf-8').splitlines():
        if not linea.strip() or linea.lstrip().startswith('#'):
            continue
        if linea.startswith('<'):
            if actual:
                clave = linea[1:].strip()
                mapa[clave] = actual
                # Los ficheros de fusiones se escribieron con los titulos tal y
                # como venian del PDF, y limpiar() ahora les quita las
                # condiciones ("con guia", "con instructor") ANTES de aplicar
                # las fusiones. Sin esta segunda clave, cada linea con una
                # condicion dejaba de encontrar a su reto y volvia a colarse.
                limpia = quitar_condiciones(clave)
                if limpia != clave:
                    mapa.setdefault(limpia, actual)
        else:
            actual = linea.strip()
    return mapa


# Logros con nombre propio: la dificultad la fijamos nosotros, no el PDF.
DIFICULTAD_FIJA = {
    'Correr una media maratón': 'dificil',
    'Correr una maratón': 'epico',
    'Correr 100 km sin parar': 'epico',
    'Alcanzar una cumbre de más de 3.000 m': 'dificil',
    'Completar 100 km en bicicleta de carretera en un día': 'dificil',
    'Completar 200 km en bicicleta de carretera en un día': 'epico',
}


def aplicar_fusiones(filas, mapa):
    """Colapsa los retos fusionados en uno solo, deslocalizado.

    La dificultad del gooal fusionado es la MENOR de las que absorbe: al quitar
    el lugar, el reto se puede hacer donde salga mas barato, y es justo lo que
    da puerta de entrada a la categoria.
    """
    if not mapa:
        return filas
    salida, grupos = [], {}
    for r in filas:
        nuevo = mapa.get(r['titulo'])
        if nuevo is None:
            salida.append(r)
            continue
        if nuevo == BORRAR:
            continue
        if nuevo not in grupos:
            g = dict(r)
            g['titulo'] = nuevo
            g['ciudad'] = None      # deslocalizado: el sitio ya no es el reto
            g['pais'] = None
            grupos[nuevo] = g
            salida.append(g)
        else:
            g = grupos[nuevo]
            if ORDEN.index(r['dificultad']) < ORDEN.index(g['dificultad']):
                g['dificultad'] = r['dificultad']
    # Los hitos con nombre propio no heredan la dificultad del PDF: una media
    # maraton no es "facil" porque una variante viniera mal graduada de origen.
    for g in grupos.values():
        fijada = DIFICULTAD_FIJA.get(g['titulo'])
        if fijada:
            g['dificultad'] = fijada
        g['puntos'] = PUNTOS[g['dificultad']]
    return salida


# ── Formato A: viajes (tabla numero / lugar / region, por pais) ───────
CONTINENTES = {'EUROPA','ASIA','AFRICA','ÁFRICA','AMÉRICA DEL NORTE Y CARIBE',
               'AMERICA DEL NORTE Y CARIBE','AMÉRICA DEL SUR','AMERICA DEL SUR',
               'OCEANÍA','OCEANIA'}
# Continente -> dificultad (Europa barato, Oceania/remoto el viaje de una vida)
DIF_CONTINENTE = {'EUROPA':'facil','ASIA':'dificil','AFRICA':'dificil','ÁFRICA':'dificil',
                  'AMÉRICA DEL NORTE Y CARIBE':'dificil','AMERICA DEL NORTE Y CARIBE':'dificil',
                  'AMÉRICA DEL SUR':'dificil','AMERICA DEL SUR':'dificil',
                  'OCEANÍA':'epico','OCEANIA':'epico'}
# Destinos remotos que suben a epico aunque no sean Oceania
REMOTO = {'antartida','groenlandia','svalbard','isla de pascua','galapagos','patagonia',
          'ushuaia','kamchatka','everest','himalaya','kilimanjaro','machu picchu',
          'salar de uyuni','torres del paine','polo sur','polo norte'}

def parse_viajes(path):
    out, ls = [], lineas(path)
    ruido = re.compile(r'^(2\.000 lugares|Página \d+$|ÍNDICE$|INDICE$)')
    continente, pais, i = None, None, 0
    esperado = 1
    # saltar portada e indice: empezar donde aparece el primer continente
    while i < len(ls) and ls[i] not in CONTINENTES:
        i += 1
    i += 0
    seen_first = False
    while i < len(ls):
        l = ls[i]
        if ruido.match(l):
            i += 1; continue
        if l in CONTINENTES:
            # el indice tambien lista continentes; el bueno es el que va seguido de un pais y un "1"
            continente = l; i += 1; continue
        if l.isdigit() and int(l) == esperado:
            # numero + lugar + region
            if i + 2 < len(ls):
                titulo, ciudad = ls[i+1], ls[i+2]
                dif = DIF_CONTINENTE.get(continente, 'dificil')
                plano = sin_acentos(titulo + ' ' + ciudad)
                if any(r in plano for r in REMOTO):
                    dif = 'epico'
                # Los PDFs de las otras categorias traen frases de accion
                # ("Visitar el Louvre"); aqui el PDF da el toponimo pelado, asi
                # que se prefija para que las cards del muro sean homogeneas.
                out.append({'titulo': f'Visitar {titulo}', 'descripcion': None,
                            'categoria': 'viajes', 'dificultad': dif,
                            'puntos': PUNTOS[dif], 'ciudad': ciudad, 'pais': pais,
                            'd_pdf': None})
                esperado += 1
                i += 3; continue
            i += 1; continue
        # cualquier otra cosa en zona de contenido es cabecera de pais
        if not l.isdigit():
            pais = l
        i += 1
    return out

# ── Formato B: deporte ("[ ] Titulo    Dificultad N/5") ──────────────
RE_DEP = re.compile(r'^\[\s*\]\s*(.+?)\s{2,}Dificultad\s*(\d)\s*/\s*5\b(.*)$')
RE_DEP_LAX = re.compile(r'^\[\s*\]\s*(.+?)\s+Dificultad\s*(\d)\s*/\s*5\b(.*)$')
RE_SECCION = re.compile(r'^(.+?)\s*[-–]\s*\d+\s+retos\s*$')

def parse_deporte(path):
    out, ls = [], lineas(path)
    seccion, sub = None, None
    for l in ls:
        m = RE_DEP.match(l) or RE_DEP_LAX.match(l)
        if m:
            titulo, d = m.group(1).strip(), int(m.group(2))
            dif = D_MAP[d]
            desc = ' · '.join(x for x in (seccion, sub) if x)
            out.append({'titulo': titulo, 'descripcion': desc or None, 'categoria': 'deporte',
                        'dificultad': dif, 'puntos': PUNTOS[dif], 'ciudad': None,
                        'pais': None, 'd_pdf': d})
            continue
        s = RE_SECCION.match(l)
        if s:
            seccion, sub = s.group(1).strip(), None
            continue
        if l.startswith('[') or l.startswith('Página') or l.startswith('Bucket List'):
            continue
        # continuacion del aviso "(Realizar con instructor...)" partido en dos lineas
        if l.startswith('(') or l[0].islower() or l.endswith('.)'):
            continue
        if 2 < len(l) < 60 and not l.isdigit():
            sub = l
    return out

# ── Formato C: aventura / cultura / gastronomia / musica ─────────────
RE_C = re.compile(r'^(\d{3,4})\s*\[\s*\]\s*(.+?)\s*\[D(\d)\]\s*$')

def parse_fichas(path, categoria):
    out, ls = [], lineas(path)
    seccion = None
    buf = None
    for l in ls:
        if re.match(r'^(BUCKET LIST|Indice$|\d+$)', l):
            continue
        cand = (buf + ' ' + l) if buf else l
        m = RE_C.match(cand)
        if m:
            buf = None
            cuerpo = m.group(2).strip()
            d = int(m.group(3))
            ciudad = pais = None
            if ' - ' in cuerpo:
                titulo, loc = cuerpo.rsplit(' - ', 1)
                titulo = titulo.strip(); loc = loc.strip()
                partes = [p.strip() for p in loc.split(',') if p.strip()]
                if len(partes) >= 2:
                    ciudad, pais = ', '.join(partes[:-1]), partes[-1]
                elif partes:
                    pais = partes[0]
            else:
                titulo = cuerpo
            dif = (D_MAP_AVENTURA if categoria == 'aventura' else D_MAP)[d]
            out.append({'titulo': titulo, 'descripcion': seccion, 'categoria': categoria,
                        'dificultad': dif, 'puntos': PUNTOS[dif],
                        'ciudad': ciudad, 'pais': pais, 'd_pdf': d})
            continue
        if re.match(r'^\d{3,4}\s*\[', cand):   # ficha partida en varias lineas
            buf = cand
            continue
        buf = None
        if 2 < len(l) < 70:
            seccion = l
    return out

# Un mismo sitio sale en dos PDFs ("Visitar Museo del Prado" esta en viajes y
# en cultura). Es el mismo acto: dejar las dos copias permite cobrar los puntos
# dos veces. Gana la categoria que mejor encaja, en este orden.
PRIORIDAD = ['espectaculos', 'viajes', 'deporte', 'gastronomia', 'musica',
             'aventura', 'cultura']


# ── Formato D: espectaculos (ficheros de texto, no PDF) ──────────────
# "puntos | titulo | ciudad | pais", una linea por gooal. Los eventos abiertos
# (una final de Champions, una pelea de UFC) van sin ciudad ni pais: se mueven
# de sitio cada ano y por eso no van al mapa.
#
# Dos fuentes: estadios_generado.txt lo escribe estadios.py desde el PDF de
# estadios y no se toca a mano; espectaculos.txt se edita a mano.
ESPECTACULOS = ['estadios_generado.txt', 'festivales_generado.txt',
                'fiestas_generado.txt', 'espectaculos.txt']

# Gooals escritos a mano que se suman a una categoria que viene de un PDF.
# Los PDFs traen lo que traen; esto es para lo que falta y sabemos que falta:
# los benchmarks de fuerza en deporte, las experiencias de musica que el PDF
# convirtio en una lista de festivales. Mismo formato de cinco columnas.
MANUALES = {
    'deporte': ['nuevos_deporte.txt', 'deportes_practicar.txt'],
    'musica':  ['nuevos_musica.txt'],
}


def leer_manual(nombre, categoria):
    """Filas de un fichero de texto en formato 'puntos | titulo | ciudad | pais | consulta'."""
    out = []
    ruta = Path(__file__).parent / nombre
    if not ruta.is_file():
        return out
    for n, linea in enumerate(ruta.read_text(encoding='utf-8').splitlines(), 1):
        linea = linea.strip()
        if not linea or linea.startswith('#') or '|' not in linea:
            continue
        campos = [c.strip() for c in linea.split('|')]
        if not campos[0].isdigit():
            continue
        puntos = int(campos[0])
        titulo = re.sub(r'\s+', ' ', campos[1])
        if not titulo:
            print(f'  {nombre}:{n} línea sin título, la salto', file=sys.stderr)
            continue
        out.append({
            'titulo': titulo, 'descripcion': None, 'categoria': categoria,
            'dificultad': dificultad_de_puntos(puntos), 'puntos': puntos,
            'ciudad': campos[2] if len(campos) > 2 and campos[2] else None,
            'pais': campos[3] if len(campos) > 3 and campos[3] else None,
            'geo_consulta': campos[4] if len(campos) > 4 and campos[4] else None,
        })
    return out


def parse_espectaculos():
    """Lee los ficheros de espectáculos. Devuelve filas ya listas."""
    out = []
    for nombre in ESPECTACULOS:
        ruta = Path(__file__).parent / nombre
        if not ruta.is_file():
            print(f'  espectaculos  falta {nombre}, lo salto', file=sys.stderr)
            continue
        for n, linea in enumerate(ruta.read_text(encoding='utf-8').splitlines(), 1):
            linea = linea.strip()
            if not linea or linea.startswith('#') or '|' not in linea:
                continue
            campos = [c.strip() for c in linea.split('|')]
            if not campos[0].isdigit():
                continue
            puntos = int(campos[0])
            titulo = re.sub(r'\s+', ' ', campos[1])
            ciudad = campos[2] if len(campos) > 2 and campos[2] else None
            pais = campos[3] if len(campos) > 3 and campos[3] else None
            # Quinta columna opcional: la consulta con la que buscar el sitio en
            # el mapa. Solo la llevan los que el titulo no basta para encontrar
            # ("...en Bristol" hay que preguntarlo como "Bristol Motor Speedway,
            # Tennessee"). Viaja en gooals.json para geocodificar.mjs y NO se
            # inserta en la tabla: no es informacion de producto.
            consulta = campos[4] if len(campos) > 4 and campos[4] else None
            if not titulo:
                print(f'  {nombre}:{n} línea sin título, la salto', file=sys.stderr)
                continue
            out.append({
                'titulo': titulo, 'descripcion': None, 'categoria': 'espectaculos',
                # Aquí NO se aplica la dificultad geográfica: los puntos son la
                # exclusividad del sitio, no lo lejos que esté. Ir al Camp Nou
                # vale lo mismo vivas en Barcelona o en Tokio.
                'dificultad': dificultad_de_puntos(puntos), 'puntos': puntos,
                'ciudad': ciudad, 'pais': pais, 'geo_consulta': consulta,
            })
    return out

TRABAJOS = [
    ('2000_lugares_bucket_list_mundial.pdf', 'viajes', parse_viajes, 2000),
    ('bucket_list_1141_retos_deportivos.pdf', 'deporte', parse_deporte, 1141),
    ('bucket_list_aventura.pdf', 'aventura', parse_fichas, 424),
    ('bucket_list_gastronomia.pdf', 'gastronomia', parse_fichas, 599),
    ('bucket_list_cultura.pdf', 'cultura', parse_fichas, 546),
    ('bucket_list_musica.pdf', 'musica', parse_fichas, 508),
]


# ══ Limpieza y salida ══

# ── 1. "pais" generico que no es un lugar -> null ────────────────────
GENERICO = re.compile(
    r'^(centro|destino|club|circuito|escuela|gimnasio|sala|local|zona|rocodromo|'
    r'instalacion|instalaciones|cualquier|segun|chocolateria|panaderia|pista|'
    r'campo|complejo|estadio|recinto|academia|taller|espacio|parque acuatico|'
    r'operador|proveedor|tienda|mercado local|restaurante|bar|coctele|'
    r'evento|competicion|prueba|carrera|federacion|'
    r'entorno|region|area|multiples|varios|varias|global|mundial|online)\b',
    re.I)

# ── 2. Tildes en paises y ciudades (los PDFs vienen sin acentuar) ────
PAISES = {
 'Espana':'España','Mexico':'México','Peru':'Perú','Panama':'Panamá','Canada':'Canadá',
 'Japon':'Japón','Belgica':'Bélgica','Paises Bajos':'Países Bajos','Hungria':'Hungría',
 'Rumania':'Rumanía','Turquia':'Turquía','Sudafrica':'Sudáfrica','Etiopia':'Etiopía',
 'Tunez':'Túnez','Iran':'Irán','Pakistan':'Pakistán','Butan':'Bután','Taiwan':'Taiwán',
 'Oman':'Omán','Arabia Saudi':'Arabia Saudí','Emiratos Arabes Unidos':'Emiratos Árabes Unidos',
 'Libano':'Líbano','Kirguistan':'Kirguistán','Uzbekistan':'Uzbekistán','Kazajistan':'Kazajistán',
 'Azerbaiyan':'Azerbaiyán','Republica Dominicana':'República Dominicana',
 'Papua Nueva Guinea':'Papúa Nueva Guinea','Republica Checa':'República Checa',
 'Haiti':'Haití','Vietnam':'Vietnam','Curazao':'Curazao','Reunion':'Reunión',
 'Africa':'África','Africa austral':'África austral','Africa occidental':'África occidental',
 'Africa oriental':'África oriental','Africa tropical':'África tropical',
 'America Latina':'América Latina','Asia Central':'Asia Central','Atlantico Sur':'Atlántico Sur',
 'Amazonia':'Amazonía','Caribe neerlandes':'Caribe neerlandés','Costa de Marfil':'Costa de Marfil',
}
CIUDADES = {
 'Paris':'París','Pekin':'Pekín','Berlin':'Berlín','Munich':'Múnich','Zurich':'Zúrich',
 'Moscu':'Moscú','Sao Paulo':'São Paulo','Bogota':'Bogotá','Medellin':'Medellín',
 'Asuncion':'Asunción','Panama':'Panamá','Merida':'Mérida','Cancun':'Cancún',
 'Malaga':'Málaga','Cadiz':'Cádiz','Cordoba':'Córdoba','Leon':'León','Gijon':'Gijón',
 'Almeria':'Almería','Caceres':'Cáceres','Avila':'Ávila','Alcala de Henares':'Alcalá de Henares',
 'San Sebastian':'San Sebastián','A Coruna':'A Coruña','Logrono':'Logroño','Vigo':'Vigo',
 'Sevilla':'Sevilla','Nueva Delhi':'Nueva Delhi','Estambul':'Estambul','Atenas':'Atenas',
 'Dusseldorf':'Düsseldorf','Colonia':'Colonia','Basilea':'Basilea','Ginebra':'Ginebra',
 'Quebec':'Quebec','Montreal':'Montreal','Nuevo Mexico':'Nuevo México','Yucatan':'Yucatán',
 'Michoacan':'Michoacán','Oaxaca':'Oaxaca','Ciudad de Mexico':'Ciudad de México',
 'Reykjavik':'Reikiavik','Tokio':'Tokio','Seul':'Seúl','Hanoi':'Hanói','Saigon':'Saigón',
 'Dublin':'Dublín','Belen':'Belén','Jerusalen':'Jerusalén','Tunez':'Túnez',
}

# ── 2b. Condiciones pegadas al titulo ────────────────────────────────
# "Visitar un crater con guia" y "Visitar un crater" son el mismo recuerdo: si
# fuiste con guia o sin el no cambia nada de lo que cuentas despues. Los PDFs
# las anaden por precaucion legal, pero en un perfil sobran y ademas crean
# parejas casi identicas que el desduplicador no ve porque el texto difiere.
# Se quitan de TODAS las categorias, no solo de deporte.
CONDICION = re.compile(
    # El adjetivo final va DENTRO del grupo: "con guia gastronomico" entero, no
    # solo "con guia" — si no, queda "Recorrer Addis Mercato gastronomico".
    r'\s+(con (un |una )?(gu[ií]a|instructor|entrenador|monitor|profesional(es)?|'
    r'operador( certificado)?|equipo( adecuado)?|formaci[oó]n( espec[ií]fica| adecuada)?|'
    r'certificaci[oó]n( adecuada| t[eé]cnica)?|dispositivo asistido|'
    r'preparaci[oó]n adecuada|supervisi[oó]n|sistema de seguridad|'
    r'personal cualificado)|'
    r'en zona (autorizada|segura)( y segura)?|'
    r'en (un )?(centro|circuito|instalaci[oó]n) (especializad[oa]|homologad[oa])|'
    r'habilitad[oa]|bajo supervisi[oó]n)'
    r'(\s+(local|gastron[oó]mic[oa]|especializad[oa]|certificad[oa]|cualificad[oa]|'
    r'expert[oa]|segur[oa]|autorizad[oa]|oficial|t[eé]cnic[oa]))?\b'
    r'|\s+o zona autorizada\b', re.I)
# Los adjetivos sueltos que dicen lo mismo en mitad de la frase.
GUIADO = re.compile(r'\s+(guiad[oa]s?|acompa[nñ]ad[oa]s?|supervisad[oa]s?)\b', re.I)


def quitar_condiciones(titulo):
    t = CONDICION.sub('', titulo)
    t = GUIADO.sub('', t)
    return re.sub(r'\s+', ' ', t).strip(' ,')


# ── 2c. Relleno del PDF de gastronomia ───────────────────────────────
# Dos coletillas se repiten en 366 de sus 598 titulos: "en su contexto local"
# y "donde forma parte de la tradicion local". No dicen nada — la ciudad y el
# pais ya van en su columna — y convierten "Probar Pad thai" en una frase de
# folleto. Se quitan.
#
# Ademas el PDF viene sin tildes, asi que despues de quitar la coletilla el
# plato se escribe en minuscula (en espanol un plato no es nombre propio) y se
# acentua lo que se pueda. La minuscula solo se aplica si NO hay otra mayuscula
# en el titulo: asi "Paella valenciana" baja a "paella valenciana" pero
# "New York cheesecake" y "Bacalhau a Bras" se quedan como estan.
RELLENO = re.compile(
    r'\s+(en su contexto local|donde forma parte de la tradici[oó]n local|'
    r'donde forma parte de la tradicion local|en su version local|'
    r'en su lugar de origen)$', re.I)

TILDES_PLATO = {
    'Jamon': 'Jamón', 'Limeno': 'Limeño', 'limeno': 'limeño',
    'Salteñas': 'salteñas', 'iberico': 'ibérico', 'autentico': 'auténtico',
    'tradicion': 'tradición', 'gastronomico': 'gastronómico',
    'Cafe': 'Café', 'cafe': 'café', 'Te': 'Té', 'Anis': 'Anís',
    'Pastel de nata recien horneado': 'pastel de nata recién horneado',
    'Cuscus': 'cuscús', 'Pulpo a feira': 'pulpo á feira',
    'Marroqui': 'marroquí', 'marroqui': 'marroquí', 'Peruano': 'peruano',
}


def limpiar_plato(titulo):
    """Quita la coletilla del PDF y deja el plato como se escribe en espanol."""
    t = RELLENO.sub('', titulo).strip()
    m = re.match(r'^(Probar|Cocinar|Catar|Desayunar|Cenar|Comer)\s+(.+)$', t)
    if m:
        verbo, plato = m.group(1), m.group(2)
        # Solo se baja a minuscula si el plato no lleva otro nombre propio.
        if not re.search(r'\s[A-ZÁÉÍÓÚÑ]', plato):
            plato = plato[0].lower() + plato[1:]
        t = f'{verbo} {plato}'
    for mal, bien in TILDES_PLATO.items():
        t = re.sub(r'\b' + re.escape(mal) + r'\b', bien, t)
    return re.sub(r'\s+', ' ', t).strip()


# Se entiende que un salto BASE se hace desde donde se puede saltar y que a Son
# Doong se entra con quien hay que entrar. "Autorizado" es una coletilla legal
# del PDF y en un perfil no pinta nada: nadie cuenta que su expedicion estaba
# autorizada. Se quita el adjetivo y, si al quitarlo queda colgando el sitio
# generico que modificaba ("con expedicion", "desde mirador"), tambien.
AUTORIZADO = re.compile(r'\s+autorizad[oa]\b', re.I)
COLGANDO = re.compile(
    r'\s+(con|desde|en|por)\s+(un |una |el |la )?'
    r'(expedici[oó]n|mirador|operador|gu[ií]a|puente|centro|club|empresa)\s*$', re.I)
# El PDF duda en voz alta: "Sobrevolar o contemplar las Lineas de Nazca".
DUDA = re.compile(r'\s+o (contemplar|visitar|ver|recorrer)\b', re.I)


def quitar_autorizaciones(titulo):
    t = DUDA.sub('', titulo)
    sin_adjetivo = AUTORIZADO.sub('', t)
    # COLGANDO solo entra si de verdad se ha quitado un "autorizado": si no,
    # se lleva complementos que si dicen algo. "Tocar un DJ set en un club" no
    # es lo mismo que "Tocar un DJ set", y "Viajar a la Antartida en
    # expedicion" tampoco sobra. El sitio generico solo estorba cuando estaba
    # ahi para sostener el adjetivo legal.
    if sin_adjetivo != t:
        sin_adjetivo = COLGANDO.sub('', sin_adjetivo)
    return re.sub(r'\s+', ' ', sin_adjetivo).strip()


def limpiar(rows):
    for r in rows:
        p = r.get('pais')
        if p:
            p = p.strip()
            if GENERICO.match(p):
                r['pais'] = None
            else:
                r['pais'] = PAISES.get(p, p)
        c = r.get('ciudad')
        if c:
            c = c.strip()
            r['ciudad'] = CIUDADES.get(c, c)
        # La distancia manda sobre la dificultad del PDF (nunca la baja).
        r['dificultad'] = combinar(r['dificultad'],
                                   dificultad_geografica(r['pais'], r['titulo']))
        r['puntos'] = PUNTOS[r['dificultad']]
        # titulo sin espacios dobles ni condiciones que no cambian el recuerdo
        r['titulo'] = quitar_autorizaciones(
            quitar_condiciones(re.sub(r'\s+', ' ', r['titulo']).strip()))
        if r['categoria'] == 'gastronomia':
            r['titulo'] = limpiar_plato(r['titulo'])
        if r.get('descripcion'):
            r['descripcion'] = re.sub(r'\s+', ' ', r['descripcion']).strip()
    return rows


# ── 3. Salida: dedupe, SQL idempotente y JSON para el seeder ─────────
def lit(v):
    """Literal SQL escapando la comilla simple, o NULL."""
    if v is None or v == '':
        return 'null'
    return "'" + str(v).replace("'", "''") + "'"


def sql_categoria(cat, rows):
    """Un solo INSERT ... SELECT FROM (VALUES ...) con guarda de duplicados."""
    rep = {k: sum(1 for r in rows if r['dificultad'] == k) for k in PUNTOS}
    L = [
        '-- ═══════════════════════════════════════════════════════════',
        f'-- GooALS — seed de gooals_v2: categoría "{cat}"',
        f'-- Generado por scripts/seed-gooals/generar_sql.py',
        f'-- {len(rows)} gooals · ' + ' · '.join(f'{k}: {v}' for k, v in rep.items())
        + f' · {sum(r["puntos"] for r in rows)} puntos en total',
        '--',
        '-- Idempotente: compara título + categoría, así que relanzarlo no duplica.',
        '-- ═══════════════════════════════════════════════════════════',
        '',
        'insert into gooals_v2 (titulo, descripcion, categoria, dificultad, puntos, ciudad, pais, activo)',
        'select v.titulo, v.descripcion, v.categoria, v.dificultad, v.puntos, v.ciudad, v.pais, true',
        'from (values',
        ',\n'.join(
            f'  ({lit(r["titulo"])}, {lit(r["descripcion"])}, {lit(cat)}, '
            f'{lit(r["dificultad"])}, {r["puntos"]}, {lit(r["ciudad"])}, {lit(r["pais"])})'
            for r in rows
        ),
        ') as v(titulo, descripcion, categoria, dificultad, puntos, ciudad, pais)',
        'where not exists (',
        '  select 1 from gooals_v2 g where g.titulo = v.titulo and g.categoria = v.categoria',
        ');',
        '',
    ]
    return '\n'.join(L)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    base = Path(sys.argv[1])
    solo = sys.argv[2] if len(sys.argv) > 2 else None
    if not base.is_dir():
        print(f'No encuentro la carpeta de PDFs: {base}', file=sys.stderr)
        return 1

    destino = Path(__file__).parent / 'output'
    destino.mkdir(parents=True, exist_ok=True)

    salida, declarados, cuentas, dups = {}, {}, {}, 0
    for fichero, cat, fn, esperados in TRABAJOS:
        if solo and cat != solo:
            continue
        ruta = base / fichero
        if not ruta.is_file():
            print(f'  {cat:12} falta {fichero}, lo salto', file=sys.stderr)
            continue

        filas = fn(ruta) if fn in (parse_viajes, parse_deporte) else fn(ruta, cat)
        filas = limpiar(filas)
        cuentas[cat] = {'extraidos': len(filas), 'declarados': esperados}

        antes = len(filas)
        filas = aplicar_fusiones(filas, leer_fusiones(cat))
        cuentas[cat]['fusionados'] = antes - len(filas)

        # Los escritos a mano entran DESPUÉS de las fusiones: no salen del PDF,
        # así que no tienen nada que fusionar y no deben contar como extraídos.
        if cat in MANUALES:
            manuales = []
            for fichero in MANUALES[cat]:
                manuales += leer_manual(fichero, cat)
            if manuales:
                cuentas[cat]['manuales'] = len(manuales)
                filas = filas + manuales

        # Un título repetido en el mismo país crearía dos filas idénticas. El
        # país entra en la clave porque un topónimo puede estar en dos países
        # (Cataratas Victoria: Zambia y Zimbabue) y son dos gooals distintos.
        vistos, unicas = set(), []
        for r in filas:
            clave = (sin_acentos(r['titulo']), sin_acentos(r['pais'] or ''))
            if clave in vistos:
                dups += 1
                continue
            vistos.add(clave)
            unicas.append(r)
        cuentas[cat]['duplicados'] = len(filas) - len(unicas)

        # Un toponimo puede estar en varios paises ("Blue Lagoon" sale en cuatro).
        # Son gooals distintos, pero en Explorar se verian como cuatro filas
        # identicas, asi que se desambiguan con el pais.
        cuenta = {}
        for r in unicas:
            cuenta[sin_acentos(r['titulo'])] = cuenta.get(sin_acentos(r['titulo']), 0) + 1
        for r in unicas:
            if cuenta[sin_acentos(r['titulo'])] > 1 and r['pais']:
                r['titulo'] = f"{r['titulo']} · {r['pais']}"

        salida[cat] = unicas
        declarados[cat] = esperados

    # Espectáculos no sale de un PDF sino de dos ficheros de texto, así que no
    # pasa por limpiar() ni por fusiones: viene ya escrito como queremos.
    if not solo or solo == 'espectaculos':
        filas = parse_espectaculos()
        if filas:
            # Dos recintos distintos pueden llamarse igual: hay un Red Bull
            # Arena en Leipzig y otro en Salzburgo, y un Allianz Stadium en
            # Turín y otro en Sídney. Son cuatro gooals, no dos, así que se
            # desambiguan con la ciudad en vez de tirar uno.
            cuenta = {}
            for r in filas:
                k = sin_acentos(r['titulo'])
                cuenta[k] = cuenta.get(k, 0) + 1
            for r in filas:
                if cuenta[sin_acentos(r['titulo'])] > 1 and r['ciudad']:
                    r['titulo'] = f"{r['titulo']} · {r['ciudad']}"

            vistos, unicas = set(), []
            for r in filas:
                clave = sin_acentos(r['titulo'])
                if clave in vistos:
                    dups += 1
                    continue
                vistos.add(clave)
                unicas.append(r)
            cuentas['espectaculos'] = {
                'extraidos': len(filas), 'declarados': len(filas),
                'duplicados': len(filas) - len(unicas),
            }
            salida['espectaculos'] = unicas

    # Dedupe cruzado: un mismo sitio sale en dos PDFs y es el mismo acto, asi
    # que se queda la copia de la categoria de mayor prioridad.
    cruzados = 0
    if not solo:
        adjudicado = {}
        for c in PRIORIDAD:
            for r in salida.get(c, []):
                adjudicado.setdefault(sin_acentos(r['titulo']), c)
        for c in list(salida):
            antes = len(salida[c])
            salida[c] = [r for r in salida[c]
                         if adjudicado[sin_acentos(r['titulo'])] == c]
            cuentas[c]['cedidos'] = antes - len(salida[c])
            cruzados += cuentas[c]['cedidos']

    # Cuadre: adonde ha ido cada reto. Sin esto, un total mas bajo que el que
    # declara el PDF parece un fallo del parser cuando casi siempre es una
    # decision deliberada (una fusion, o una copia cedida a otra categoria).
    print(f"\n  {'':12}{'PDF':>6}{'extrae':>8}{'fusion':>8}{'dupli':>7}"
          f"{'cede':>6}{'mano':>6}{'final':>7}   dificultad")
    descuadre = []
    for cat, filas_cat in salida.items():
        (destino / f'{cat}.sql').write_text(sql_categoria(cat, filas_cat), encoding='utf-8')
        c = cuentas[cat]
        rep = {k: sum(1 for r in filas_cat if r['dificultad'] == k) for k in PUNTOS}
        print(f"  {cat:12}{c['declarados']:>6}{c['extraidos']:>8}"
              f"{-c.get('fusionados', 0) or '':>8}{-c.get('duplicados', 0) or '':>7}"
              f"{-c.get('cedidos', 0) or '':>6}"
              f"{'+' + str(c['manuales']) if c.get('manuales') else '':>6}"
              f"{len(filas_cat):>7}   "
              + ' · '.join(f'{k}:{v}' for k, v in rep.items()))
        if c['extraidos'] != c['declarados']:
            descuadre.append(
                f"{cat}: el PDF declara {c['declarados']} y el parser extrae "
                f"{c['extraidos']}")
        suma = (c['extraidos'] - c.get('fusionados', 0) - c.get('duplicados', 0)
                - c.get('cedidos', 0) + c.get('manuales', 0))
        if suma != len(filas_cat):
            descuadre.append(f'{cat}: no cuadra ({suma} != {len(filas_cat)})')

    print('\n  Las columnas negativas son decisiones, no perdidas: fusion =')
    print('  retos colapsados por fusiones_<cat>.txt, dupli = titulos repetidos')
    print('  en el PDF, cede = copias que se lleva otra categoria (PRIORIDAD),')
    print('  mano = gooals escritos a mano que el PDF no traia.')
    if descuadre:
        print('\n  !! REVISAR EL PARSER:', file=sys.stderr)
        for d in descuadre:
            print('     ' + d, file=sys.stderr)

    if not salida:
        print('No he generado nada.', file=sys.stderr)
        return 1

    # Las coordenadas las pone geocodificar.mjs, que tarda casi una hora. Sin
    # esto, cualquier regeneracion del catalogo las borraria y habria que volver
    # a geocodificar desde cero.
    destino_json = Path(__file__).parent / 'gooals.json'
    if destino_json.is_file():
        try:
            previo = json.loads(destino_json.read_text(encoding='utf-8'))
        except (ValueError, OSError):
            previo = {}
        coords = {}
        for cat_previa, filas_previas in previo.items():
            for r in filas_previas:
                if r.get('lat') is not None or r.get('geo'):
                    coords[(cat_previa, r['titulo'])] = {
                        k: r[k] for k in ('lat', 'lng', 'geo', 'geo_encontrado')
                        if k in r
                    }
        rescatadas = 0
        for cat_nueva, filas_nuevas in salida.items():
            for r in filas_nuevas:
                guardado = coords.get((cat_nueva, r['titulo']))
                if guardado:
                    r.update(guardado)
                    rescatadas += 1
        if coords:
            print(f'\ncoordenadas conservadas: {rescatadas} de {len(coords)}')
            if rescatadas < len(coords):
                print(f'  {len(coords) - rescatadas} se pierden porque su título ha cambiado;'
                      ' vuelve a lanzar geocodificar.mjs para recuperarlas.')

    destino_json.write_text(
        json.dumps(salida, ensure_ascii=False), encoding='utf-8')

    total = sum(len(v) for v in salida.values())
    print(f'\n{total} gooals · {dups} duplicados dentro de categoría'
          + (f' · {cruzados} repetidos entre categorías' if cruzados else ''))
    print(f'SQL en {destino}/ · JSON en gooals.json (lo lee insertar.mjs)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
