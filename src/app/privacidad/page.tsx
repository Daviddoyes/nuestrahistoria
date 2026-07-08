import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacidadPage() {
  return (
    <main
      className="min-h-screen bg-[#0A0A0A] px-6 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#666666] active:text-[#E8692A] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver
        </Link>

        <h1 className="font-serif text-2xl font-bold text-[#F0F0F0] tracking-tight">
          Política de privacidad
        </h1>
        <div className="h-px w-12 bg-[#E8692A] mt-3 mb-6" />

        <p className="text-sm text-[#999999] leading-relaxed">
          Estamos preparando nuestra política de privacidad. Muy pronto encontrarás aquí toda la
          información sobre cómo tratamos y protegemos tus datos.
        </p>
      </div>
    </main>
  )
}
