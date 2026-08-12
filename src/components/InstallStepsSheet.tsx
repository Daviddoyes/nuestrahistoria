'use client'

import { X, Share, SquarePlus, Check, ArrowDown, EllipsisVertical, Download } from 'lucide-react'

type Props = {
  platform: 'ios' | 'android'
  onClose: () => void
}

/** Azul de los controles de Safari en iOS: hace reconocibles los mocks. */
const IOS_BLUE = '#0A84FF'

/** Marco común de los mocks: imita una fila de la interfaz del navegador. */
function Mock({ children, justify = 'between' }: { children: React.ReactNode; justify?: 'between' | 'center' | 'end' }) {
  const justifyClass =
    justify === 'center' ? 'justify-center' : justify === 'end' ? 'justify-end' : 'justify-between'
  return (
    <div
      className={`flex items-center ${justifyClass} rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5`}
      style={{ height: 44 }}
      aria-hidden
    >
      {children}
    </div>
  )
}

function Paso({ n, texto, nota, children }: {
  n: number
  texto: React.ReactNode
  nota?: string
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 flex items-center justify-center rounded-full bg-[#1DE9B6] text-[#0A0A0A] font-bold"
        style={{ width: 22, height: 22, fontSize: 11, marginTop: 2 }}
        aria-hidden
      >
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F0F0F0] leading-snug">{texto}</p>
        <div className="mt-2">{children}</div>
        {nota && <p className="text-[11px] text-[#555555] mt-1.5">{nota}</p>}
      </div>
    </li>
  )
}

function PasosIOS() {
  return (
    <>
      <Paso n={1} texto="Toca el icono compartir" nota="Abajo del todo en Safari.">
        {/* Barra inferior de Safari */}
        <div
          className="flex items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
          style={{ height: 44, gap: 28 }}
          aria-hidden
        >
          <span className="text-[#3A3A3A] text-lg leading-none">‹</span>
          <span className="text-[#3A3A3A] text-lg leading-none">›</span>
          <span
            className="flex items-center justify-center rounded-lg"
            style={{ width: 30, height: 30, background: 'rgba(10,132,255,0.15)', outline: `1.5px solid ${IOS_BLUE}` }}
          >
            <Share className="w-4 h-4" style={{ color: IOS_BLUE }} />
          </span>
          <span className="text-[#3A3A3A] text-lg leading-none">□</span>
        </div>
      </Paso>

      <Paso n={2} texto="Desplázate hacia abajo" nota="La opción está en la segunda mitad del menú.">
        <Mock justify="center">
          <ArrowDown className="w-4 h-4 text-[#666666]" />
        </Mock>
      </Paso>

      <Paso n={3} texto={<>Toca <span className="font-semibold">Añadir a pantalla de inicio</span></>}>
        <Mock>
          <span className="text-[13px] text-[#F0F0F0]">Añadir a pantalla de inicio</span>
          <SquarePlus className="w-4 h-4 text-[#F0F0F0] shrink-0" />
        </Mock>
      </Paso>

      <Paso n={4} texto={<>Toca <span className="font-semibold">Añadir</span></>} nota="Arriba a la derecha. Ya lo tienes.">
        <Mock justify="end">
          <span className="text-[13px] font-semibold" style={{ color: IOS_BLUE }}>Añadir</span>
        </Mock>
      </Paso>
    </>
  )
}

function PasosAndroid() {
  return (
    <>
      <Paso n={1} texto="Toca el menú de Chrome" nota="Los tres puntos, arriba a la derecha.">
        <Mock justify="end">
          <span
            className="flex items-center justify-center rounded-lg"
            style={{ width: 30, height: 30, background: 'rgba(29,233,182,0.12)', outline: '1.5px solid #1DE9B6' }}
          >
            <EllipsisVertical className="w-4 h-4 text-[#1DE9B6]" />
          </span>
        </Mock>
      </Paso>

      <Paso n={2} texto={<>Toca <span className="font-semibold">Instalar aplicación</span></>} nota="En algunos móviles se llama «Añadir a pantalla de inicio».">
        <Mock>
          <span className="text-[13px] text-[#F0F0F0]">Instalar aplicación</span>
          <Download className="w-4 h-4 text-[#F0F0F0] shrink-0" />
        </Mock>
      </Paso>

      <Paso n={3} texto={<>Confirma con <span className="font-semibold">Instalar</span></>}>
        <Mock justify="end">
          <span className="text-[13px] font-semibold text-[#1DE9B6]">Instalar</span>
        </Mock>
      </Paso>
    </>
  )
}

export default function InstallStepsSheet({ platform, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instalar-pasos-titulo"
        className="fixed inset-x-0 bottom-0 z-[60] bg-[#0A0A0A] modal-slide-up overflow-y-auto"
        style={{
          maxHeight: '85vh',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '20px 24px',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 id="instalar-pasos-titulo" className="text-lg font-bold text-[#F0F0F0]">
              Añadir a tu pantalla de inicio
            </h2>
            <p className="text-[13px] text-[#666666] mt-1 leading-relaxed">
              {platform === 'ios'
                ? 'iOS no permite instalar de un toque. Son cuatro.'
                : 'Tu navegador no ofreció el instalador. Hazlo a mano:'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-[#555555] active:text-[#F0F0F0] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="space-y-5">
          {platform === 'ios' ? <PasosIOS /> : <PasosAndroid />}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 py-3.5 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
        >
          <Check className="w-4 h-4" />
          Entendido
        </button>
      </div>
    </>
  )
}
