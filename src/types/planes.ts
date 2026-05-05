export type Plan = {
  id: string
  titulo: string
  descripcion: string | null
  creado_por: string
  pareja_codigo: string
  estado: string
  foto_url: string | null
  historia_descripcion: string | null
  created_at: string
}

export type NewPlan = Omit<Plan, 'id' | 'created_at'>

export type Profile = {
  id: string
  nombre: string
  email: string
  pareja_id: string | null
  codigo_invitacion: string
  plan: 'free' | 'premium'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}
