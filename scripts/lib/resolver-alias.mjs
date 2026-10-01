// Hace que los scripts de node entiendan el alias "@/" de TypeScript.
//
// Los ficheros de src/ se importan entre ellos como '@/lib/...', que es lo que
// resuelve el tsconfig. Node no sabe nada de eso, así que sin este gancho un
// script no puede reutilizar el código de la app y habría que copiarlo: dos
// copias de la misma validación que tarde o temprano dejan de coincidir.
import { existsSync } from 'node:fs'
import { dirname, resolve as unir } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC = unir(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), 'src')

// En TypeScript los imports van sin extensión; node las exige. Se prueban en el
// mismo orden que usa el compilador.
const EXTENSIONES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

export function resolve(especificador, contexto, siguiente) {
  if (!especificador.startsWith('@/')) return siguiente(especificador, contexto)

  const base = unir(SRC, especificador.slice(2))
  for (const ext of EXTENSIONES) {
    if (existsSync(base + ext)) return siguiente(pathToFileURL(base + ext).href, contexto)
  }
  return siguiente(pathToFileURL(base).href, contexto)
}
