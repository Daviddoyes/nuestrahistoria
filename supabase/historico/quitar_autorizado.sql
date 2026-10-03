-- GooALS — fuera la coletilla "autorizado"
--
-- Se entiende que un salto BASE se hace desde donde se puede saltar y que a Son
-- Doong se entra con quien hay que entrar. Es una coletilla legal del PDF y en
-- un perfil no pinta nada: nadie cuenta que su expedición estaba autorizada.
--
-- Cuando al quitar el adjetivo quedaba colgando el sitio genérico que lo
-- sostenía ("con expedición", "desde mirador"), se va también — pero SOLO en
-- ese caso: "Tocar un DJ set en un club" no es lo mismo que "Tocar un DJ set".
--
-- UPDATE, no borrar: cada fila conserva su id, sus coordenadas y cualquier
-- lista de usuario donde esté marcada. Se puede lanzar dos veces.

update gooals_v2 g
set titulo = v.nuevo
from (values
  ('aventura', 'Salto BASE tandem autorizado desde Kjerag', 'Salto BASE tandem desde Kjerag'),
  ('aventura', 'Ver osos polares con expedicion autorizada', 'Ver osos polares'),
  ('aventura', 'Explorar Son Doong con expedicion autorizada', 'Explorar Son Doong'),
  ('aventura', 'Hacer un pendulo gigante desde puente autorizado', 'Hacer un pendulo gigante'),
  ('cultura', 'Sobrevolar o contemplar las Lineas de Nazca desde mirador autorizado', 'Sobrevolar las Lineas de Nazca'),
  ('deporte', 'Hacer una ruta de quad por montaña autorizada', 'Hacer una ruta de quad por montaña')
) as v(categoria, viejo, nuevo)
where g.categoria = v.categoria and g.titulo = v.viejo;

-- Debe salir 0.
select count(*) as quedan from gooals_v2 where titulo ilike '%autorizad%';
