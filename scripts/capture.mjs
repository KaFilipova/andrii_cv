/**
 * Screenshots every station through headless Chrome.
 *
 * Run the dev server (or `vite preview`) first, then:
 *   node scripts/capture.mjs [url] [outDir]
 *   node scripts/capture.mjs --viewport=390x844            # the phone layout
 *
 * It drives Chrome over the DevTools protocol rather than through
 * `--screenshot`, for two reasons. Windows refuses to open a browser window
 * narrower than 500px, so `--window-size=390,844` silently renders a 500px
 * layout and crops it — which makes a phone screenshot a lie. And
 * `--virtual-time-budget` fast-forwards timers without running the matching
 * number of animation frames, so loops are caught in their first second.
 * `Emulation.setDeviceMetricsOverride` gives a true viewport, and waiting in
 * real time gives a frame the deck has actually animated into.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const positional = args.filter((a) => !a.startsWith('--'))

const url = positional[0] ?? 'http://localhost:5173/'
const outDir = resolve(positional[1] ?? 'shots')
// `--viewport=390x844` works in every shell; the env var is the same knob.
const [width, height] = (flag('viewport') ?? process.env.CAPTURE_VIEWPORT ?? '1600x900')
  .split('x')
  .map(Number)
const settleMs = Number(process.env.CAPTURE_SETTLE ?? 3200)
const mobile = width < 900
const deviceScaleFactor = mobile ? 2 : 1
const port = Number(process.env.CAPTURE_PORT ?? 9333)

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
if (!chrome) {
  console.error('No Chrome found. Set CHROME_PATH to the binary.')
  process.exit(1)
}

// The slide list is the source of truth; read the ids straight out of it.
const source = readFileSync(new URL('../src/content/slides.ts', import.meta.url), 'utf8')
const ids = [...source.matchAll(/^\s{4}id: '([a-z]+)',$/gm)].map((m) => m[1])
if (ids.length === 0) {
  console.error('Could not read slide ids from src/content/slides.ts')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

/** A minimal CDP client: one socket, one id counter, promises per command. */
const connect = async (endpoint) => {
  const socket = new WebSocket(endpoint)
  const pending = new Map()
  const listeners = new Set()
  let nextId = 0

  await new Promise((ok, fail) => {
    socket.addEventListener('open', ok, { once: true })
    socket.addEventListener('error', () => fail(new Error(`Cannot reach ${endpoint}`)), { once: true })
  })

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id !== undefined) {
      const waiter = pending.get(message.id)
      pending.delete(message.id)
      if (!waiter) return
      if (message.error) waiter.fail(new Error(message.error.message))
      else waiter.ok(message.result)
      return
    }
    for (const listener of listeners) listener(message)
  })

  return {
    send: (method, params = {}, sessionId) =>
      new Promise((ok, fail) => {
        const id = (nextId += 1)
        pending.set(id, { ok, fail })
        socket.send(JSON.stringify({ id, method, params, sessionId }))
      }),
    once: (method, sessionId) =>
      new Promise((ok) => {
        const listener = (message) => {
          if (message.method !== method) return
          if (sessionId && message.sessionId !== sessionId) return
          listeners.delete(listener)
          ok(message.params)
        }
        listeners.add(listener)
      }),
    close: () => socket.close(),
  }
}

const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    // Outside the repo. A Chrome profile is several hundred files, and
    // writing it next to the output buries every real change in the diff.
    `--user-data-dir=${join(tmpdir(), 'cv-deck-capture-profile')}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const endpoint = await (async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      return (await response.json()).webSocketDebuggerUrl
    } catch {
      await sleep(250)
    }
  }
  throw new Error('Chrome never opened its debugging port')
})()

const cdp = await connect(endpoint)

try {
  for (const [i, id] of ids.entries()) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
      screenWidth: width,
      screenHeight: height,
    }, sessionId)
    await cdp.send('Page.enable', {}, sessionId)

    const loaded = cdp.once('Page.loadEventFired', sessionId)
    await cdp.send('Page.navigate', { url: `${url}#${id}` }, sessionId)
    await loaded
    // Real time, so the station's own loop has actually run.
    await sleep(settleMs)

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId)
    const file = resolve(outDir, `${String(i + 1).padStart(2, '0')}-${id}.png`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    console.log(`${id} → ${file}`)

    await cdp.send('Target.closeTarget', { targetId })
  }
} finally {
  cdp.close()
  browser.kill()
}
