// ⚠️ Secreto compartido, no seguridad real: esta clave viaja en el bundle del
// cliente (src/app/admin/page.tsx la incrusta), así que cualquiera que abra las
// devtools puede llamar a /api/admin/*. Es el patrón que ya usaba /api/admin-stats;
// se centraliza aquí para no repetirlo. Si /admin llega a gestionar datos
// sensibles, migrar a auth de verdad (rol de admin en la sesión de Supabase).
export const ADMIN_KEY = 'LivestoryAdmin2024'

export function isAdminRequest(request: Request): boolean {
  const header = request.headers.get('x-admin-key') ?? request.headers.get('X-Admin-Key')
  return header === ADMIN_KEY
}
