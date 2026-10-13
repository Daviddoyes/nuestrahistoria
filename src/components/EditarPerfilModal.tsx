'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motivoInvalido, USERNAME_MAX } from '@/lib/username'
import { cuandoPuedoCambiarUsername } from '@/lib/actions'
import { X, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Avatar from './Avatar'

type Props = {
  userId: string
  nombreActual: string
  usernameActual: string | null
  fotoActual: string | null
  onClose: () => void
  onGuardado: (cambios: { nombre: string; username: string; foto_perfil_url: string | null }) => void
}

/** Reduce el avatar a 800px y JPEG 0.85 antes de subirlo al bucket 'avatars'. */
function comprimirAvatar(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 800
      let { width, height } = img
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX }
      if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob falló'))),
        'image/jpeg', 0.85
      )
    }
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = url
  })
}

export default function EditarPerfilModal({
  userId, nombreActual, usernameActual, fotoActual, onClose, onGuardado,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)

  const [nombre, setNombre] = useState(nombreActual)
  /**
   * EL NOMBRE ES LO QUE SE VE; EL @USUARIO ES POR LO QUE TE ENCUENTRAN.
   *
   * Los dos aquí y no en dos sitios: son las dos mitades de «quién eres», y
   * tenerlas separadas hace que nadie encuentre la segunda.
   *
   * Y se puede cambiar a propósito: quien se equivocó al escribirlo tiene que
   * poder arreglarlo. Lo que no se puede es coger el que otro acaba de soltar,
   * y de eso se encarga la base (ver supabase/fase4a.sql), no esta pantalla.
   */
  const [username, setUsername] = useState(usernameActual ?? '')
  // null = todavía sin comprobar; true/false = lo que contestó la base.
  const [libre, setLibre] = useState<boolean | null>(null)
  const [comprobando, setComprobando] = useState(false)
  /**
   * Hasta cuándo NO puede cambiarlo, o null si puede ya.
   *
   * Se pregunta AL ABRIR y no al guardar: enterarse de que no se puede cuando
   * ya lo has escrito es la peor forma de enterarse — has hecho el trabajo y
   * el único premio es un error. Sabiéndolo antes, el campo ni se deja tocar.
   */
  const [bloqueadoHasta, setBloqueadoHasta] = useState<Date | null>(null)

  useEffect(() => {
    let vigente = true
    cuandoPuedoCambiarUsername()
      .then(r => { if (vigente && r.hasta) setBloqueadoHasta(new Date(r.hasta)) })
      // Si falla, se deja sin bloquear: el disparador lo impide igual, y
      // bloquear el campo por un fallo de red sería impedir algo que sí se
      // puede. Más vale un error al guardar que una puerta cerrada de mentira.
      .catch(() => {})
    return () => { vigente = false }
  }, [])
  const [foto, setFoto] = useState<string | null>(fotoActual)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // El formato se comprueba aquí para avisar mientras se escribe. Quien manda
  // es el disparador de la base: esto es la cara amable, no la cerradura.
  const limpio = username.trim().toLowerCase()
  const cambiaElUsuario = limpio !== (usernameActual ?? '').toLowerCase()
  const malFormato = cambiaElUsuario && limpio.length > 0 ? motivoInvalido(limpio) : null

  useEffect(() => {
    if (bloqueadoHasta || !cambiaElUsuario || malFormato || !limpio) { setLibre(null); return }
    let vigente = true
    setComprobando(true)
    const t = setTimeout(async () => {
      // Se pregunta a username_libre() y no se lee profiles: la tabla no la
      // puede leer el navegador, y esa función existe justo para esto.
      const { data, error } = await supabase.rpc('username_libre', { nombre_pedido: limpio })
      if (!vigente) return
      // Si la consulta falla NO se dice que está libre: se deja sin contestar y
      // que lo rechace la base al guardar. Un «libre» inventado es peor que un
      // «no lo sé», porque el siguiente paso es un error que nadie esperaba.
      setLibre(error ? null : Boolean(data))
      setComprobando(false)
    }, 400)
    return () => { vigente = false; clearTimeout(t) }
  }, [limpio, cambiaElUsuario, malFormato, bloqueadoHasta, supabase])

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file)
    setFoto(URL.createObjectURL(file))
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('Escribe tu nombre.'); return }
    if (malFormato) { setError(malFormato); return }
    if (cambiaElUsuario && libre === false) { setError('Ese nombre de usuario ya está cogido.'); return }
    setGuardando(true)
    setError('')

    try {
      let fotoUrl = fotoActual

      if (archivo) {
        const comprimida = await comprimirAvatar(archivo)
        const ruta = `avatar-${userId}.jpg`
        const { error: upError } = await supabase.storage
          .from('avatars')
          .upload(ruta, comprimida, { upsert: true, contentType: 'image/jpeg' })
        if (upError) throw upError

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(ruta)
        // El nombre de fichero es fijo, así que sin este parámetro el navegador
        // (y el CDN) seguirían sirviendo el avatar anterior.
        fotoUrl = `${publicUrl}?t=${Date.now()}`
      }

      const { error: updateError } = await supabase
        .from('profiles')
        // El @usuario solo se manda si CAMBIA. Mandarlo igual haría que el
        // disparador lo viera como un cambio... no: compara con `is not distinct from`
        // y sale antes. Pero no mandarlo deja más claro qué se está tocando.
        .update(
          cambiaElUsuario
            ? { nombre: nombre.trim(), username: limpio, foto_perfil_url: fotoUrl }
            : { nombre: nombre.trim(), foto_perfil_url: fotoUrl }
        )
        .eq('id', userId)
      if (updateError) throw updateError

      onGuardado({ nombre: nombre.trim(), username: cambiaElUsuario ? limpio : (usernameActual ?? ''), foto_perfil_url: fotoUrl })
    } catch (err) {
      console.error('[EditarPerfilModal]', err)
      // El mensaje del disparador se enseña TAL CUAL: dice exactamente qué
      // pasa —reservado, retirado, o cuándo podrás volver a cambiarlo— y
      // sustituirlo por «no se pudo» sería tirar la única explicación que hay.
      const msg = err instanceof Error ? err.message : ''
      setError(msg && msg.length < 200 ? msg : 'No hemos podido guardar los cambios. Inténtalo de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !guardando && onClose()}
    >
      <div className="w-full bg-[#1E2120] rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-[modal-slide-up_0.25s_ease-out]">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#2A2E2C] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between border-b border-[#2A2E2C]">
          <h2 className="fuente-titular font-semibold text-[#FFFFFF] text-base">Editar perfil</h2>
          <button
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
            className="text-[#7A8A85] active:text-[#FFFFFF] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#2A2E2C] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={guardar} className="px-5 pt-5 pb-5 space-y-5">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar nombre={nombre || '?'} foto={foto} size={88} />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={guardando}
                aria-label="Cambiar foto"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00D1A7] border-2 border-[#1E2120] flex items-center justify-center text-[#0B0B0B] active:scale-90 transition-transform disabled:opacity-60"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFoto}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#7A8A85] mb-1.5">
              Tu nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              maxLength={60}
              placeholder="Escribe tu nombre"
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2E2C] bg-[#2A2E2C] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base"
            />
            {!nombre.trim() && (
              <p className="text-xs text-[#FF5252] mt-1.5">El nombre no puede quedar vacío.</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#7A8A85] mb-1.5">
              Tu @usuario
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A8A85] text-base">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                disabled={Boolean(bloqueadoHasta)}
                maxLength={USERNAME_MAX}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="tu_usuario"
                className="w-full pl-9 pr-4 py-3.5 rounded-xl border border-[#2A2E2C] bg-[#2A2E2C] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base"
              />
            </div>
            {/* Un aviso cada vez y en este orden: primero si no vale la forma,
                y solo si vale se mira si está cogido. Enseñar los dos a la vez
                hace dudar de cuál hay que arreglar. */}
            {bloqueadoHasta ? (
              <p className="text-xs text-[#7A8A85] mt-1.5">
                Ya lo cambiaste hace poco. Podrás volver a cambiarlo el{' '}
                {bloqueadoHasta.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
            ) : malFormato ? (
              <p className="text-xs text-[#FF5252] mt-1.5">{malFormato}</p>
            ) : comprobando ? (
              <p className="text-xs text-[#7A8A85] mt-1.5">Comprobando…</p>
            ) : libre === false ? (
              <p className="text-xs text-[#FF5252] mt-1.5">Ese @usuario ya está cogido.</p>
            ) : libre === true ? (
              <p className="text-xs text-[#00D1A7] mt-1.5">Libre.</p>
            ) : (
              <p className="text-xs text-[#7A8A85] mt-1.5">Es por lo que te encuentran. Solo se puede cambiar una vez cada 30 días.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3.5 rounded-xl border border-[#2A2E2C] text-[#7A8A85] active:bg-[#2A2E2C] transition-colors text-sm font-medium min-h-[44px] disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              // El bloqueo del @usuario NO bloquea el botón: el nombre y la
              // foto se pueden cambiar igual, y además con el campo desactivado
              // `cambiaElUsuario` ya es false.
              disabled={guardando || !nombre.trim() || Boolean(malFormato) || (cambiaElUsuario && libre === false)}
              className="flex-1 bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-30 text-[#0B0B0B] py-3.5 rounded-xl transition-colors text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2"
            >
              {guardando && (
                <span className="w-4 h-4 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
              )}
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
