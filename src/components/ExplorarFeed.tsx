'use client'

import SugerenciasIA from './SugerenciasIA'
import CercaDeTi from './CercaDeTi'
import type { Plan, Profile } from '@/types/planes'

type Props = {
  profile: Profile
  pendientes: Plan[]
  historias: Plan[]
  /** Se llama tras añadir un plan, para refrescar la lista del usuario. */
  onPlanCopiado: () => void
}

export default function ExplorarFeed({ profile, pendientes, historias, onPlanCopiado }: Props) {
  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      } as React.CSSProperties}
    >
      <SugerenciasIA
        profile={profile}
        pendientes={pendientes}
        historias={historias}
        onPlanAnadido={onPlanCopiado}
      />

      <div style={{ marginTop: 24 }}>
        <p style={{
          fontSize: 10, color: '#666666', letterSpacing: '0.15em',
          textTransform: 'uppercase', padding: '0 16px', marginBottom: 12,
        }}>
          Cerca de ti
        </p>
        <CercaDeTi onPlanAdded={onPlanCopiado} />
      </div>
    </div>
  )
}
