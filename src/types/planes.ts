export type Plan = {
  id: string
  titulo: string
  descripcion: string | null
  creado_por: string
  estado: string
  foto_url: string | null
  historia_descripcion: string | null
  created_at: string
}

export type NewPlan = Omit<Plan, 'id' | 'created_at'>
