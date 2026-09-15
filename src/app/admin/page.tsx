import { redirect } from 'next/navigation'

/** /admin abre el catálogo: es el trabajo de cada día. Las métricas se miran de vez en cuando. */
export default function AdminPage() {
  redirect('/admin/gooals')
}
