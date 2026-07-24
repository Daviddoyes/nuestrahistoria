// Haversine aproximado: convierte diferencias de grados a km (1º ≈ 111 km) y
// corrige la longitud por la latitud. Suficiente para "a cuántos km" en un feed;
// no es geodésico exacto pero el error a escala de país es pequeño.
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

export const CAT_COLOR: Record<string, string> = {
  viajes: '#3B82F6',
  deporte: '#10B981',
  gastronomia: '#F59E0B',
  cultura: '#8B5CF6',
  aventura: '#E8692A',
  musica: '#EC4899',
}
