import Link from 'next/link'
import PedirEnlaceContrasena from '@/components/PedirEnlaceContrasena'

export const metadata = { title: 'El enlace ya no vale · GooALS' }

/**
 * Adonde va a parar un enlace de contraseña caducado, ya usado o manipulado.
 *
 * Antes, cuando el enlace fallaba, se acababa en la pantalla de entrar sin
 * explicación ninguna: la persona volvía a intentar lo mismo una y otra vez.
 * Aquí se dice qué ha pasado y se puede pedir otro sin moverse de sitio.
 */
export default function EnlaceCaducadoPage() {
  return (
    <main
      className="min-h-screen bg-[#0B0B0B] flex flex-col justify-center px-6 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <div className="w-10 h-10 rounded-full bg-[#00D1A7] flex items-center justify-center mb-4">
            <span className="text-[#0B0B0B] font-bold text-sm tracking-wide">G</span>
          </div>
          <h1 className="fuente-titular text-3xl font-bold text-[#FFFFFF] tracking-tight">
            Este enlace ya no vale
          </h1>
          <p className="text-sm text-[#A3B1AC] mt-3" style={{ lineHeight: 1.6 }}>
            Los enlaces para cambiar la contraseña duran una hora y solo sirven una vez.
            Pide otro y te lo mandamos ahora mismo.
          </p>
          <div className="h-px w-12 bg-[#00D1A7] mt-4" />
        </div>

        <PedirEnlaceContrasena />

        <Link
          href="/"
          className="block text-center text-sm text-[#7A8A85] mt-6"
          style={{ minHeight: 44, lineHeight: '44px' }}
        >
          Volver a entrar
        </Link>
      </div>
    </main>
  )
}
