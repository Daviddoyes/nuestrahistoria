'use client'

import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { ATRIBUCION_MAPA, URL_MOSAICOS } from '@/lib/mapa-mosaicos'

type Props = {
  lat: number
  lng: number
  color: string
}

/**
 * Dónde cae el pin de un gooal, sin salir de la lista. Solo lectura: mover el
 * pin es la cola de geolocalización, no este bloque.
 */
export default function MiniMapaPin({ lat, lng, color }: Props) {
  return (
    // isolation: Leaflet pone z-index de hasta 1.000 y sin aislarlo taparía los
    // diálogos de confirmación del panel.
    <div style={{ height: 200, borderRadius: 10, overflow: 'hidden', border: '1px solid #2A2E2C', isolation: 'isolate' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%', background: '#1E2120' }}
      >
        <TileLayer url={URL_MOSAICOS} attribution={ATRIBUCION_MAPA} maxZoom={19} />
        <CircleMarker
          center={[lat, lng]}
          radius={9}
          pathOptions={{ color: '#0B0B0B', weight: 2, fillColor: color, fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  )
}
