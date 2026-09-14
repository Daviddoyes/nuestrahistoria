#!/usr/bin/env python3
"""Genera fusiones_aventura.txt desde el PDF crudo (antes de fusionar nada).

    python fusiones_aventura.py ../../RETOS

GRUPOS es la fuente de verdad; el .txt es la version editable a mano que lee
generar_sql.py. Se lee del PDF, no de gooals.json, porque gooals.json ya puede
venir fusionado de una pasada anterior.
"""
import sys, types
from pathlib import Path

# (titulo nuevo, [titulos originales que absorbe])
GRUPOS = [
 # ── Aire y altura ────────────────────────────────────────────────
 ('Saltar en paracaídas en tándem', [
  'Paracaidismo sobre Palm Jumeirah','Paracaidismo sobre Interlaken y los Alpes',
  'Paracaidismo junto al Fox Glacier','Paracaidismo sobre Oahu',
  'Paracaidismo sobre Mission Beach','Paracaidismo sobre la costa de Empuriabrava',
  'Paracaidismo sobre el desierto de Namibia','Paracaidismo sobre el lago Taupo']),
 ('Hacer puenting desde un puente o una presa', [
  'Bungee desde Kawarau Bridge','Bungee Nevis','Bungee Bloukrans Bridge',
  'Bungee sobre el Zambeze junto a Victoria Falls','Bungee de la presa de Verzasca',
  'Bungee Macau Tower','Bungee Niouc','Bungee Europabruecke']),
 ('Lanzarse en un swing gigante sobre un cañón', [
  'Swing gigante en el cañon de Nevis','Swing sobre el cañon de Oribi Gorge']),
 ('Volar en parapente en tándem', [
  'Parapente sobre Oludeniz','Parapente sobre Interlaken','Parapente sobre Chamonix',
  'Parapente sobre Pokhara y Annapurna','Parapente desde Pedra Bonita',
  'Parapente sobre Cape Town','Parapente sobre Gudauri','Parapente sobre Annecy',
  'Parapente sobre Queenstown','Parapente sobre Tenerife']),
 ('Volar en ala delta en tándem', [
  'Ala delta sobre Rio de Janeiro','Ala delta en Kitty Hawk','Ala delta en Valle de Bravo']),
 ('Volar en globo al amanecer', [
  'Vuelo en globo sobre Bagan','Vuelo en globo sobre Luxor',
  'Vuelo en globo sobre Marrakech y el Atlas','Vuelo en globo sobre Teotihuacan',
  'Vuelo en globo sobre Napa Valley','Vuelo en globo sobre Yarra Valley']),
 ('Sobrevolar un paisaje en helicóptero', [
  'Vuelo en helicoptero sobre el Grand Canyon','Vuelo en helicoptero sobre Manhattan',
  'Vuelo en helicoptero sobre Kauai','Vuelo en helicoptero sobre Victoria Falls']),
 ('Cruzar un valle en tirolina', [
  'Zipline Jebel Jais Flight','Zipline Toro Verde Monster','Zipline sobre Monteverde',
  'Zipline sobre Whistler','Zipline sobre el bosque de Chiang Mai',
  'Zipline sobre Icy Strait Point']),

 # ── Agua y velocidad ─────────────────────────────────────────────
 ('Hacer rafting en aguas bravas', [
  'Rafting en el Futaleufu','Rafting en el Colorado por Grand Canyon','Rafting en el Pacuare',
  'Rafting en el rio Tara','Rafting en el Noce','Rafting en el Franklin',
  'Rafting en el Kali Gandaki','Rafting en el Sun Kosi','Rafting en el Tully River',
  'Rafting en el Ottawa River','Rafting en el Kaituna y su cascada']),
 ('Hacer kayak de mar en una travesía guiada', [
  'Kayak en Milford Sound','Kayak en los fiordos noruegos','Kayak entre islas de Palawan',
  'Kayak en Ha Long Bay','Kayak en los manglares de Florida',
  'Kayak en los canales de Tortuguero','Kayak por el lago Titicaca',
  'Kayak entre cuevas marinas del Algarve','Kayak alrededor de Dubrovnik',
  'Kayak por los lagos de Plitvice en zonas permitidas',
  'Paddle surf en mar abierto con travesia guiada']),
 ('Hacer kayak entre icebergs', ['Kayak de mar entre icebergs','Kayak frente a glaciares en Alaska','SUP entre icebergs']),
 ('Hacer descenso de barrancos', [
  'Canyoning en el barranco de Vero','Canyoning en Mascun','Canyoning en Verdon',
  'Canyoning en Interlaken','Canyoning en Madeira','Canyoning en Azores',
  'Canyoning en Ticino','Canyoning en Queenstown','Canyoning en Blue Mountains',
  'Canyoning en Cebu','Canyoning en Bali','Barranquismo en Wadi Mujib']),
 ('Hacer coasteering en una costa rocosa', [
  'Coasteering en Pembrokeshire','Coasteering en Mallorca','Coasteering en Madeira']),
 ('Aprender kitesurf y navegar solo', [
  'Kitesurf en Tarifa','Kitesurf en Cabarete','Kitesurf en Dakhla',
  'Kitesurf en Jericoacoara','Kitesurf en Le Morne']),
 ('Navegar en windsurf con viento fuerte', ['Windsurf en Pozo Izquierdo','Windsurf en Maui']),
 ('Aprender wingfoil', ['Wingfoil en Tarifa','Wingfoil en Lago de Garda']),
 ('Pilotar una moto de agua en una ruta costera', [
  'Moto de agua alrededor de Dubai','Moto de agua frente a Miami Beach',
  'Moto de agua por la Costa Brava','Moto de agua en Ibiza','Moto de agua en Bora Bora']),
 ('Montar en jet boat por un cañón fluvial', ['Jet boat Shotover River','Jet boat en Niagara River']),
 ('Hacer wakeboard', ['Wakeboard en cable park','Wakeboard detras de lancha','Wakesurf detras de lancha']),

 # ── Oceano, buceo y apnea ────────────────────────────────────────
 ('Bucear en un arrecife tropical', [
  'Bucear en Raja Ampat','Bucear en Sipadan','Bucear en Komodo','Bucear en el Mar Rojo',
  'Bucear en Bonaire','Bucear en Cozumel','Bucear en Roatan','Bucear en Poor Knights Islands',
  'Bucear en Socorro','Bucear en Cocos Island','Bucear en Fernando de Noronha',
  'Bucear en Yongala','Bucear en Malta y Gozo','Bucear en Azores','Bucear en Madeira',
  'Bucear en Cabo de Palos','Bucear en Medes']),
 ('Bucear en un pecio', [
  'Bucear en pecios de Truk Lagoon','Bucear en pecios de Coron','Bucear en SS Thistlegorm']),

 # ── Montana, escalada y trekking ─────────────────────────────────
 ('Completar una vía ferrata', [
  'Via ferrata de la Grande Fistoire','Via ferrata de Mürren-Gimmelwald',
  'Via ferrata de Dolomitas','Via ferrata Caminito del Rey areas habilitadas',
  'Via ferrata de Ronda','Via ferrata de Montserrat','Via ferrata de Telluride',
  'Via ferrata de Banff/Mt Norquay','Via ferrata de Jebel Jais','Via ferrata de Honister Pass']),
 ('Escalar en roca en una zona clásica', [
  'Escalar en Kalymnos','Escalar en El Chorro','Escalar en Siurana','Escalar en Yosemite',
  'Escalar en Joshua Tree','Escalar en Railay','Escalar en Krabi sobre el mar',
  'Escalar en Fontainebleau','Hacer boulder en Rocklands']),
 ('Escalar una cascada de hielo', [
  'Escalar hielo en Chamonix','Escalar hielo en Ouray','Escalar hielo en Islandia',
  'Escalada en glaciar']),
 ('Hacer un trekking de varios días en montaña', [
  'Hacer trekking en Svaneti','Hacer trekking en Simien Mountains',
  'Hacer trekking en Drakensberg','Hacer trekking en Rwenzori']),
 ('Subir a un volcán a ver el amanecer', [
  'Hacer el Mount Bromo sunrise trek','Hacer el Mount Batur sunrise trek']),

 # ── Nieve, hielo y frio ──────────────────────────────────────────
 ('Esquiar una jornada completa en estación', [
  'Esquiar en los Alpes suizos','Esquiar en Chamonix','Esquiar en Dolomitas',
  'Esquiar en St. Anton','Esquiar en Whistler Blackcomb','Esquiar en Hakuba',
  'Esquiar en Jackson Hole','Esquiar en Aspen','Esquiar en Banff','Esquiar en Portillo',
  'Esquiar en Valle Nevado','Esquiar en Bariloche','Esquiar en Queenstown']),
 ('Esquiar un día de nieve polvo', ['Esquiar en Niseko con powder']),
 ('Bajar una pista completa en snowboard', [
  'Hacer snowboard en Laax','Hacer snowboard en Avoriaz','Hacer snowboard en Andorra']),
 ('Hacer heliesquí con guía', ['Heliski con guia en Canada','Heliski con guia en Alaska']),
 ('Hacer una travesía de esquí de montaña', ['Ski touring al amanecer','Ski touring en Lofoten']),
 ('Caminar sobre un glaciar con crampones', [
  'Cruzar un glaciar con crampones','Caminar sobre Perito Moreno con guia',
  'Caminar sobre Franz Josef Glacier','Caminar sobre Athabasca Glacier con guia']),
 ('Conducir una moto de nieve', [
  'Conducir moto de nieve en Laponia','Conducir moto de nieve en Islandia',
  'Conducir moto de nieve en Svalbard','Conducir una moto de nieve de alto rendimiento en circuito']),
 ('Guiar un trineo de perros', ['Conducir trineo de perros']),
 ('Bañarse en agua helada', [
  'Bañarse en agua helada tras sauna','Nadar en un lago helado de forma supervisada',
  'Ice floating con traje termico']),

 # ── Motor, desierto y off-road ───────────────────────────────────
 ('Conducir un quad o buggy por dunas', [
  'Conducir un quad por dunas del Sahara','Conducir un buggy por dunas de Dubai',
  'Conducir un quad en Namibia','Conducir un buggy en Huacachina',
  'Ruta ATV en Santorini','Ruta ATV en Mykonos','Ruta en quad por Cappadocia',
  'Ruta en quad por el desierto de Agafay']),
 ('Bajar una duna en sandboard', [
  'Sandboard en Huacachina','Sandboard en Namibia','Sandboard en Dubai','Sandboard en Cerro Negro']),
 ('Cruzar un desierto en 4x4', [
  'Cruzar dunas en 4x4 en Wadi Rum','Hacer una ruta 4x4 por el Sahara',
  'Hacer una expedicion 4x4 por Namibia','Ruta off-road por Moab']),
 ('Rodar en un circuito de F1 con instructor', [
  'Rodar en Nurburgring con instructor','Rodar en Spa-Francorchamps con instructor',
  'Rodar en Monza con experiencia de circuito','Rodar en Silverstone con experiencia de circuito',
  'Rodar en Yas Marina con experiencia de circuito']),
 ('Hacer una ruta de varios días en moto', [
  'Hacer una ruta en moto por los Alpes','Hacer una ruta en moto por Dolomitas',
  'Hacer una ruta en moto por la Costa Amalfitana',
  'Hacer una ruta en moto por la Pacific Coast Highway','Hacer una ruta en moto por la Ruta 66',
  'Hacer una ruta en moto por Mae Hong Son Loop','Hacer una ruta en moto por Ha Giang Loop',
  'Hacer una ruta en moto por Ladakh','Hacer una ruta en moto por Patagonia']),

 # ── Naturaleza salvaje y expedicion ──────────────────────────────
 ('Hacer un safari en vehículo', [
  'Safari en Masai Mara','Safari en Kruger','Safari en Etosha','Safari en Okavango en mokoro']),
 ('Dormir en el desierto bajo las estrellas', [
  'Dormir en campamento bereber en dunas','Dormir bajo estrellas en Wadi Rum',
  'Dormir en el desierto de Atacama']),
 ('Explorar un tubo o campo de lava', [
  'Caminar sobre campos de lava recientes con guia','Explorar tubos de lava']),

 # ── Subterraneo, urbano y supervivencia ──────────────────────────
 ('Explorar una cueva turística de gran formato', [
  'Explorar Mammoth Cave','Explorar Carlsbad Caverns','Explorar Postojna y cuevas cercanas',
  'Explorar cuevas de lava en Lanzarote']),
 ('Hacer espeleología deportiva', [
  'Hacer espeleologia en Picos de Europa','Hacer espeleologia en Sierra de Guara',
  'Hacer espeleologia en Yucatan']),
 ('Caminar por el borde exterior de un rascacielos', [
  'Skywalk exterior de una torre','Edge walk exterior de la CN Tower',
  'Skywalk exterior en Auckland Sky Tower','Caminar por el borde de una torre con arnes']),
]

_src = (Path(__file__).parent / 'generar_sql.py').read_text()
_src = _src.replace("if __name__ == '__main__':\n    raise SystemExit(main())", '')
_m = types.ModuleType('g')
_m.__dict__['__file__'] = str(Path(__file__).parent / 'generar_sql.py')
exec(compile(_src, 'generar_sql.py', 'exec'), _m.__dict__)

base = Path(sys.argv[1] if len(sys.argv) > 1 else '../../RETOS')
av = {r['titulo']: r for r in
      _m.limpiar(_m.parse_fichas(base / 'bucket_list_aventura.pdf', 'aventura'))}

L = ["# GooALS — fusiones propuestas para la categoría aventura",
     "#",
     "# Regla: el lugar se queda cuando ES el objetivo (una cumbre, un trek con",
     "# nombre, una cueva única). Se va cuando es una sede intercambiable (una",
     "# estación, un spot, un circuito).",
     "#",
     "# Formato: una línea sin sangrar es el gooal que se queda; las que empiezan",
     "# por '<' son los retos que absorbe y desaparecen del catálogo.",
     "#",
     "# Cómo revisarlo:",
     "#   · cambia el título de la primera línea si no te convence",
     "#   · borra una línea '<' para que ESE reto sobreviva tal cual",
     "#   · borra un bloque entero para dejar el grupo como está hoy",
     "#",
     f"# {len(av)} retos ahora · {sum(len(g[1]) for g in GRUPOS)} se fusionan en {len(GRUPOS)} · "
     f"quedarían {len(av) - sum(len(g[1]) for g in GRUPOS) + len(GRUPOS)}",
     ""]

faltan = []
for nuevo, origs in GRUPOS:
    L.append(nuevo)
    for o in origs:
        if o not in av:
            faltan.append(o)
        L.append(f'< {o}')
    L.append('')

absorbidos = {o for _, os in GRUPOS for o in os}
intactos = [t for t in av if t not in absorbidos]
L += ['# ── Se quedan tal cual (el lugar es el reto, o no hay con qué fusionarlos) ──']
L += [f'# {t}' for t in sorted(intactos)]

Path('fusiones_aventura.txt').write_text('\n'.join(L) + '\n', encoding='utf-8')
print(f'{len(av)} retos · {len(absorbidos)} absorbidos en {len(GRUPOS)} grupos · '
      f'{len(intactos)} intactos → {len(intactos) + len(GRUPOS)} finales')
if faltan:
    print('NO ENCONTRADOS:', faltan)
