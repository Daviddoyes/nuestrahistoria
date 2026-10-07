import { redirect } from 'next/navigation'

/**
 * El mapa ya no es una pantalla propia: es una pestaña dentro de Explorar.
 *
 * Esta ruta se queda como redirección y NO se borra. Quien tenga la app
 * instalada la abre por aquí —el manifest decía `start_url: '/mapa'`— y su
 * móvil no se trae el manifest nuevo hasta que le parece. Sin esto, abrir la
 * app instalada daría un 404 hasta entonces. Lo mismo vale para cualquier
 * enlace guardado.
 */
export default function MapaPage() {
  redirect('/explorar?tab=mapa')
}
