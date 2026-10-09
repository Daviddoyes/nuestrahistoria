// Conduce Edge por el protocolo de DevTools, sin librerías.
//
// Node 24 ya trae cliente de WebSocket, así que basta con lanzar el navegador
// con el puerto de depuración abierto y hablarle en JSON.
//
// ── PARA QUÉ ──────────────────────────────────────────────
//
// Para abrir las pantallas de verdad y MEDIRLAS. En este repo hay cosas que no
// las caza ni `tsc` ni `next build`: un fichero 'use server' que exporta algo
// que no es una función compila perfecto y deja la página en blanco, y una
// burbuja que se sale por el lado tampoco da ningún error. La comprobación que
// las caza es abrir la página.
//
// Lo usa `npm run pantallas`. No forma parte de la app.
import { spawn } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const dormir = ms => new Promise(r => setTimeout(r, ms))

export async function abrirNavegador({ ancho = 390, alto = 844, ua, puerto = 9222 } = {}) {
  if (!existsSync(EDGE)) throw new Error('No encuentro Edge en ' + EDGE)
  const PUERTO = puerto
  const perfil = process.env.TEMP + '/edge-pruebas-' + Date.now()
  const proc = spawn(EDGE, [
    '--headless=new',
    `--remote-debugging-port=${PUERTO}`,
    `--user-data-dir=${perfil}`,
    `--window-size=${ancho},${alto}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    'about:blank',
  ], { stdio: 'ignore' })

  // Esperar a que el puerto conteste.
  // OJO: si en ese puerto YA hay un Edge de otra prueba, nos conectaríamos al
  // suyo. Por eso el puerto es un parámetro y cada guion usa el suyo.
  let objetivo = null
  for (let i = 0; i < 40 && !objetivo; i++) {
    await dormir(250)
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json/list`)
      const lista = await r.json()
      objetivo = lista.find(t => t.type === 'page')
    } catch { /* todavía no está */ }
  }
  if (!objetivo) { proc.kill(); throw new Error('Edge no abrió el puerto de depuración') }

  const ws = new WebSocket(objetivo.webSocketDebuggerUrl)
  await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = () => mal(new Error('no se pudo conectar a Edge')) })

  let id = 0
  const pendientes = new Map()
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.id && pendientes.has(m.id)) {
      const { ok, mal } = pendientes.get(m.id)
      pendientes.delete(m.id)
      if (m.error) mal(new Error(m.error.message))
      else ok(m.result)
    }
  }
  const enviar = (method, params = {}) => new Promise((ok, mal) => {
    const n = ++id
    pendientes.set(n, { ok, mal })
    ws.send(JSON.stringify({ id: n, method, params }))
  })

  // Lo que la página escriba en su consola, para poder depurar desde fuera.
  const consola = []
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data)
    if (m.method === "Runtime.consoleAPICalled") {
      consola.push(m.params.type + ": " + (m.params.args || []).map(a => a.value ?? a.description ?? a.type).join(" "))
    }
    if (m.method === "Runtime.exceptionThrown") {
      consola.push("EXCEPCION: " + (m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text))
    }
  })

  await enviar("DOM.enable")
  await enviar("Page.enable")
  await enviar('Runtime.enable')
  // Móvil de verdad: tamaño, densidad y "soy un móvil".
  await enviar('Emulation.setDeviceMetricsOverride', {
    width: ancho, height: alto, deviceScaleFactor: 2, mobile: true,
  })
  if (ua) await enviar('Emulation.setUserAgentOverride', { userAgent: ua })

  const api = {
    async ir(url, { espera = 1500 } = {}) {
      await enviar('Page.navigate', { url })
      await dormir(espera)
    },
    async ejecutar(expresion) {
      const r = await enviar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error('error en la página: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text))
      return r.result?.value
    },
    /** Cambia el tamaño de pantalla sin cerrar nada ni recargar. */
    async tamano(ancho, alto) {
      await enviar('Emulation.setDeviceMetricsOverride', {
        width: ancho, height: alto, deviceScaleFactor: 2, mobile: true,
      })
    },
    async captura(ruta) {
      const r = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      writeFileSync(ruta, Buffer.from(r.data, 'base64'))
      return ruta
    },
    /** Borra cookies y almacenamiento: deja el navegador como recién abierto. */
    async limpiarSesion() {
      await enviar('Network.enable')
      await enviar('Network.clearBrowserCookies')
      await enviar('Network.clearBrowserCache')
    },
    /** Lo que ha escrito la página en su consola desde que se abrió. */
    consolaDe() { return consola.slice() },
    /** Mete un fichero de verdad en un <input type=file>, como si lo eligieras. */
    async ponerFichero(selector, rutaEnDisco) {
      const doc = await enviar("DOM.getDocument", { depth: -1 })
      const nodo = await enviar("DOM.querySelector", { nodeId: doc.root.nodeId, selector })
      if (!nodo.nodeId) throw new Error("no encuentro el input: " + selector)
      await enviar("DOM.setFileInputFiles", { nodeId: nodo.nodeId, files: [rutaEnDisco] })
    },
    /**
     * Cerrar de verdad: el navegador y TODOS sus procesos.
     *
     * `proc.kill()` mataba solo al padre, y un Edge son diez o treinta
     * procesos. Los hijos se quedaban vivos, sin ventana y sin nadie mirando:
     * así se acumularon 579 en una semana, y el que se quedaba de guardia en el
     * puerto le robaba la conexión a la prueba siguiente.
     *
     * Y `taskkill /T` tampoco bastó, porque Edge se reorganiza y el árbol de
     * procesos deja de colgar del que lanzamos. Lo que SÍ los identifica a
     * todos es la carpeta de perfil, que es única por arranque: se buscan por
     * ahí y se cierran, que es exactamente lo que hace un humano mirando la
     * línea de comandos.
     *
     * Primero se pide por las buenas con Browser.close, que es lo limpio; el
     * barrido es la red debajo.
     */
    async cerrar() {
      try { await enviar('Browser.close') } catch { /* si ya no contesta, da igual */ }
      ws.close()
      await new Promise(listo => {
        const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command',
          `Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | ` +
          `Where-Object { $_.CommandLine -like '*${perfil.split(/[\/]/).pop()}*' } | ` +
          `ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }`,
        ], { stdio: 'ignore' })
        ps.on('exit', listo)
        ps.on('error', listo)
      })
    },
  }
  return api
}

export const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
