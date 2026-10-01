// Se carga con --import para enganchar el resolutor del alias "@/".
import { register } from 'node:module'
register('./resolver-alias.mjs', import.meta.url)
