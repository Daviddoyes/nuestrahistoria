import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — skip auth entirely so PKCE codes and hash tokens reach the client intact
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/enlace-caducado') ||
    // /auth/confirm abre la sesión: tiene que poder poner sus propias cookies sin
    // que el proxy las pise.
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/download') ||
    // /g/<id> es la página de un gooal compartido, y TIENE que funcionar sin
    // cuenta: si quien recibe el enlace se encuentra un login, la cadena se
    // rompe justo donde empezaba a servir. Va escrito aquí a propósito aunque
    // una ruta que no esté en ninguna de las dos listas ya pasaría: lo que no
    // está escrito se rompe el día que alguien añade `/g` a `isProtected`
    // pensando que falta.
    pathname.startsWith('/g/') ||
    pathname.startsWith('/api/')

  if (isPublic) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ── QUIÉN ERES, SIN SALIR A LA RED ──────────────────────
  //
  // Esto corre en CADA petición que no sea pública: cada pantalla, y también
  // cada una de las ocho o nueve que Next pide por adelantado de otras rutas.
  // Con `auth.getUser()` eran otros tantos viajes al servidor de Auth, 79 ms
  // cada uno, medidos.
  //
  // `getClaims()` comprueba la FIRMA del JWT aquí mismo con la clave pública
  // del proyecto: 1 ms. No es leer la cookie y creérsela —eso sería
  // `getSession()`, que no vale para decidir nada—, es una comprobación
  // criptográfica. El porqué entero y lo que se pierde, en `src/lib/sesion.ts`.
  const { data: claims } = await supabase.auth.getClaims()
  const user = claims?.claims?.sub ? { id: claims.claims.sub } : null

  const isProtected =
    pathname.startsWith('/inicio') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/muro') ||
    pathname.startsWith('/explorar') ||
    pathname.startsWith('/mapa') ||
    // /admin exige sesión aquí; que ADEMÁS seas admin lo comprueba el servidor
    // contra profiles.es_admin, tanto en la página como en cada /api/admin/*.
    pathname.startsWith('/admin')

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
